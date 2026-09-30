const { prisma } = require("../../config/database");
const { hashPassword } = require("../../core/utils/hash");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./admission.repository");
const { generateApplicationNumber } = require("./admission.utils");
const { sendApprovalEmail, sendRejectionEmail } = require("../../config/mailer");

const getById = async (id) => {
	const admission = await repository.findById(id);
	if (!admission) throw new NotFoundError("Admission application not found");
	return admission;
};

const validateClass = async (desiredClassId) => {
	if (!desiredClassId) return;
	const schoolClass = await repository.findClass(desiredClassId);
	if (!schoolClass || !schoolClass.isActive) throw new AppError("Active desired class not found.", 404, "CLASS_NOT_FOUND");
};

const create = async (data) => {
	await validateClass(data.desiredClassId);
	return prisma.$transaction(async (tx) => repository.create({ ...data, applicationNumber: await generateApplicationNumber(tx) }, tx));
};

const getAll = async (query) => {
	const where = {};
	if (query.status) where.status = query.status;
	if (query.desiredClassId) where.desiredClassId = query.desiredClassId;
	if (query.search) where.OR = [
		{ firstName: { contains: query.search, mode: "insensitive" } },
		{ lastName: { contains: query.search, mode: "insensitive" } },
		{ applicationNumber: { contains: query.search, mode: "insensitive" } },
		{ email: { contains: query.search, mode: "insensitive" } },
	];
	return repository.findAll(where);
};

const update = async (id, data, reviewerId) => {
	const admission = await getById(id);
	if (["CONVERTED", "WITHDRAWN"].includes(admission.status)) throw new AppError("This admission can no longer be changed.", 409, "ADMISSION_LOCKED");
	await validateClass(data.desiredClassId);
	
	const reviewData = ["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(data.status) ? { reviewedBy: reviewerId, reviewedAt: new Date() } : {};
	const updated = await repository.update(id, { ...data, ...reviewData });

	// Audit Log recording
	try {
		await prisma.auditLog.create({
			data: {
				userId: reviewerId || null,
				action: data.status === "APPROVED" ? "APPROVE_ADMISSION" : data.status === "REJECTED" ? "REJECT_ADMISSION" : "UPDATE_ADMISSION",
				entity: "Admission",
				entityId: id,
				description: `Updated admission application for ${admission.firstName} ${admission.lastName} to ${data.status || 'updated'}`
			}
		});
	} catch (err) {
		console.warn("[AuditLog Admission Error]:", err.message);
	}

	// Dispatch Notification Email on status change
	const fullName = `${admission.firstName} ${admission.lastName}`;
	const recipientEmail = admission.email || data.email;
	let communication = null;

	if (data.status === "APPROVED" && admission.status !== "APPROVED" && recipientEmail) {
		communication = { email: false, errors: [] };
		try {
			const result = await sendApprovalEmail({
				to: recipientEmail,
				name: fullName,
				role: "STUDENT",
				registrationNumber: admission.applicationNumber
			});
			if (!result?.success) throw new Error("The mailer did not accept the admission approval email.");
			communication.email = true;
			communication.messageId = result.messageId;
		} catch (emailErr) {
			console.error("[Admission Approval Email Error]:", emailErr.message);
			communication.errors.push("Application approved, but the approval email was not accepted by SMTP.");
		}
	} else if (data.status === "APPROVED" && admission.status !== "APPROVED") {
		communication = { email: false, errors: ["Application approved, but no recipient email address is available."] };
	} else if (data.status === "REJECTED" && recipientEmail) {
		try {
			await sendRejectionEmail({
				to: recipientEmail,
				name: fullName
			});
		} catch (emailErr) {
			console.error("[Admission Rejection Email Error]:", emailErr.message);
		}
	}

	return communication ? { ...updated, communication } : updated;
};

const convertToStudent = async (id, data = {}) => {
	const admission = await getById(id);
	if (admission.status !== "APPROVED") throw new AppError("Only approved admissions can be converted.", 409, "ADMISSION_NOT_APPROVED");
	if (admission.convertedStudentId) throw new AppError("Admission is already converted.", 409, "ADMISSION_ALREADY_CONVERTED");
	const payload = data || {};
	const email = payload.email || admission.email || null;
	if (email && await repository.findStudentByEmail(email.toLowerCase())) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
	const desiredClassId = payload.currentClassId || admission.desiredClassId || null;
	await validateClass(desiredClassId);

	return prisma.$transaction(async (tx) => {
		const fullName = [admission.firstName, admission.middleName, admission.lastName].filter(Boolean).join(" ");
		const user = await tx.user.create({
			data: {
				schoolId: payload.schoolId || null,
				fullName,
				email: email ? email.toLowerCase() : null,
				phoneNumber: payload.phoneNumber || admission.phoneNumber || null,
				passwordHash: await hashPassword(payload.password || `${admission.firstName}123!`),
				role: "STUDENT",
				status: "ACTIVE",
				currentClass: admission.currentClass || null,
				currentTerm: admission.currentTerm || null,
				targetClass: admission.targetClass || null,
				targetTerm: admission.targetTerm || null,
				allergies: admission.allergies || null,
				bloodGroup: admission.bloodGroup || null,
				genotype: admission.genotype || null,
				emergencyContact: admission.emergencyContact || null,
				medicalNotes: admission.medicalNotes || null,
				profileImageUrl: admission.profileImageUrl || null,
			}
		});

		const registrationNumber = await generateRegistrationNumber(tx, fullName);
		const student = await tx.student.create({
			data: {
				userId: user.id,
				registrationNumber,
				admissionNumber: admission.applicationNumber,
				firstName: admission.firstName,
				middleName: admission.middleName || null,
				lastName: admission.lastName,
				dateOfBirth: admission.dateOfBirth || null,
				gender: admission.gender || null,
				address: admission.address || null,
				currentClassId: desiredClassId,
				currentTerm: admission.currentTerm || null,
				targetClass: admission.targetClass || null,
				targetTerm: admission.targetTerm || null,
				allergies: admission.allergies || null,
				bloodGroup: admission.bloodGroup || null,
				genotype: admission.genotype || null,
				emergencyContact: admission.emergencyContact || null,
				medicalNotes: admission.medicalNotes || null,
				profileImageUrl: admission.profileImageUrl || null,
				status: "ACTIVE",
				admissionDate: new Date()
			},
			include: { currentClass: true }
		});

		await tx.admission.update({ where: { id }, data: { status: "CONVERTED", convertedStudentId: student.id, reviewedAt: new Date() } });
		
		return student;
	});
};

module.exports = { create, getAll, getById, update, convertToStudent };
