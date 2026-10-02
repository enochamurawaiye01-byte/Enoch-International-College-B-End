const { prisma } = require("../../config/database");
const crypto = require("crypto");
const { hashPassword } = require("../../core/utils/hash");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./admission.repository");
const { generateApplicationNumber } = require("./admission.utils");
const { sendApprovalEmail, sendRejectionEmail, studentApplicationApproved } = require("../../config/mailer");

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

const validatePlacement = async (desiredClassId, desiredDepartmentId) => {
	if (!desiredClassId) {
		if (desiredDepartmentId) throw new AppError("A class is required before selecting a department.", 422, "ADMISSION_CLASS_REQUIRED");
		return;
	}
	const schoolClass = await repository.findClass(desiredClassId);
	if (!schoolClass || !schoolClass.isActive) throw new AppError("Active desired class not found.", 404, "CLASS_NOT_FOUND");
	const isSeniorSecondary = schoolClass.classLevel.code.startsWith("SS");
	if (isSeniorSecondary && !desiredDepartmentId) throw new AppError("A department is required for senior secondary applicants.", 422, "STUDENT_DEPARTMENT_REQUIRED");
	if (desiredDepartmentId && !(await prisma.department.findUnique({ where: { id: desiredDepartmentId } }))) throw new AppError("Department not found.", 404, "STUDENT_DEPARTMENT_NOT_FOUND");
	if (!isSeniorSecondary && desiredDepartmentId) throw new AppError("Departments can only be selected for senior secondary classes.", 422, "STUDENT_DEPARTMENT_NOT_ALLOWED");
};

const create = async (data) => {
	await validatePlacement(data.desiredClassId, data.desiredDepartmentId);
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

const update = async (id, data, actor) => {
	const admission = await getById(id);
	const reviewerId = actor?.userId || actor?.id || actor;
	if (["CONVERTED", "WITHDRAWN"].includes(admission.status)) throw new AppError("This admission can no longer be changed.", 409, "ADMISSION_LOCKED");
	await validatePlacement(data.desiredClassId ?? admission.desiredClassId, data.desiredDepartmentId ?? admission.desiredDepartmentId);
	const reviewData = ["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(data.status) ? { reviewedBy: reviewerId, reviewedAt: new Date() } : {};
	let communication = null;
	let updated;
	const recipientEmail = admission.email || data.email;
	if (data.status === "APPROVED") {
		const converted = await convertToStudent(id, {
			schoolId: actor?.schoolId,
			approve: true,
			reviewerId,
			desiredClassId: data.desiredClassId,
			desiredDepartmentId: data.desiredDepartmentId,
			reviewNotes: data.reviewNotes,
		});
		communication = converted.communication;
		updated = await getById(id);
	} else {
		updated = await repository.update(id, { ...data, ...reviewData });
	}

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

	const fullName = `${admission.firstName} ${admission.lastName}`;
	if (data.status === "REJECTED" && recipientEmail) {
		try {
			await sendRejectionEmail({
				to: recipientEmail,
				name: fullName
			});
		} catch (emailErr) {
			console.error("[Admission Rejection Email Error]:", emailErr.message);
		}
	}

	return communication ? { ...(await getById(id)), communication } : updated;
};

const convertToStudent = async (id, data = {}) => {
	const admission = await getById(id);
	const payload = data || {};
	if (admission.status !== "APPROVED" && !payload.approve) throw new AppError("Only approved admissions can be converted.", 409, "ADMISSION_NOT_APPROVED");
	if (admission.convertedStudentId) throw new AppError("Admission is already converted.", 409, "ADMISSION_ALREADY_CONVERTED");
	const email = (payload.email || admission.email || "").trim().toLowerCase();
	if (!email) throw new AppError("A student email is required before enrollment.", 422, "STUDENT_EMAIL_REQUIRED");
	if (await repository.findStudentByEmail(email)) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
	const desiredClassId = payload.currentClassId || payload.desiredClassId || admission.desiredClassId || null;
	if (!desiredClassId) throw new AppError("Select a class before completing student enrollment.", 422, "ADMISSION_CLASS_REQUIRED");
	await validateClass(desiredClassId);

	const student = await prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM "Admission" WHERE id = ${id} FOR UPDATE`;
		const lockedAdmission = await tx.admission.findUnique({ where: { id } });
		if (!lockedAdmission) throw new NotFoundError("Admission application not found");
		if (lockedAdmission.convertedStudentId) throw new AppError("Admission is already converted.", 409, "ADMISSION_ALREADY_CONVERTED");
		if (lockedAdmission.status !== "APPROVED" && !payload.approve) throw new AppError("Only approved admissions can be converted.", 409, "ADMISSION_NOT_APPROVED");
		const lockedClassId = payload.currentClassId || payload.desiredClassId || lockedAdmission.desiredClassId || desiredClassId;
		const departmentId = payload.desiredDepartmentId ?? lockedAdmission.desiredDepartmentId ?? null;
		const schoolClass = await tx.class.findUnique({ where: { id: lockedClassId }, include: { classLevel: true } });
		if (!schoolClass || !schoolClass.isActive) throw new AppError("Active desired class not found.", 404, "CLASS_NOT_FOUND");
		const isSeniorSecondary = schoolClass.classLevel.code.startsWith("SS");
		if (isSeniorSecondary && !departmentId) throw new AppError("A department is required for senior secondary applicants.", 422, "STUDENT_DEPARTMENT_REQUIRED");
		if (departmentId && !(await tx.department.findUnique({ where: { id: departmentId } }))) throw new AppError("Department not found.", 404, "STUDENT_DEPARTMENT_NOT_FOUND");
		if (!isSeniorSecondary && departmentId) throw new AppError("Departments can only be selected for senior secondary classes.", 422, "STUDENT_DEPARTMENT_NOT_ALLOWED");
		const session = await tx.academicSession.findFirst({
			where: { isActive: true, ...(payload.schoolId ? { schoolId: payload.schoolId } : {}) },
			include: { terms: { where: { isActive: true }, orderBy: { startDate: "desc" }, take: 1 } }
		});
		const term = session?.terms[0];
		if (!session || !term) throw new AppError("An active academic session and term are required before enrollment.", 409, "ACTIVE_ACADEMIC_TERM_REQUIRED");
		const fullName = [lockedAdmission.firstName, lockedAdmission.middleName, lockedAdmission.lastName].filter(Boolean).join(" ");
		const user = await tx.user.create({
			data: {
				schoolId: payload.schoolId || null,
				fullName,
				email,
				phoneNumber: payload.phoneNumber || lockedAdmission.phoneNumber || null,
				passwordHash: await hashPassword(payload.password || crypto.randomBytes(24).toString("base64url")),
				role: "STUDENT",
				status: "ACTIVE",
				currentClass: lockedAdmission.currentClass || null,
				currentTerm: term.name,
				targetClass: lockedAdmission.targetClass || null,
				targetTerm: lockedAdmission.targetTerm || null,
				allergies: lockedAdmission.allergies || null,
				bloodGroup: lockedAdmission.bloodGroup || null,
				genotype: lockedAdmission.genotype || null,
				emergencyContact: lockedAdmission.emergencyContact || null,
				medicalNotes: lockedAdmission.medicalNotes || null,
				profileImageUrl: lockedAdmission.profileImageUrl || null,
			}
		});

		const registrationNumber = await generateRegistrationNumber(tx, fullName);
		const student = await tx.student.create({
			data: {
				userId: user.id,
				registrationNumber,
				admissionNumber: lockedAdmission.applicationNumber,
				firstName: lockedAdmission.firstName,
				middleName: lockedAdmission.middleName || null,
				lastName: lockedAdmission.lastName,
				dateOfBirth: lockedAdmission.dateOfBirth || null,
				gender: lockedAdmission.gender || null,
				address: lockedAdmission.address || null,
				currentClassId: schoolClass.id,
				desiredDepartmentId: departmentId,
				currentSessionId: session.id,
				currentTerm: term.name,
				targetClass: lockedAdmission.targetClass || null,
				targetTerm: lockedAdmission.targetTerm || null,
				allergies: lockedAdmission.allergies || null,
				bloodGroup: lockedAdmission.bloodGroup || null,
				genotype: lockedAdmission.genotype || null,
				emergencyContact: lockedAdmission.emergencyContact || null,
				medicalNotes: lockedAdmission.medicalNotes || null,
				profileImageUrl: lockedAdmission.profileImageUrl || null,
				status: "ACTIVE",
				admissionDate: new Date()
			},
			include: { currentClass: { include: { classLevel: true } } }
		});
		const enrollment = await tx.enrollment.create({
			data: { studentId: student.id, sessionId: session.id, termId: term.id, classId: schoolClass.id, departmentId: isSeniorSecondary ? departmentId : null, status: "ACTIVE", enrollmentDate: new Date() }
		});
		const classSubjects = await tx.classSubject.findMany({
			where: { classId: schoolClass.id, subject: { isActive: true } },
			include: { subject: true }
		});
		const applicableSubjects = classSubjects.filter(({ subject }) => !isSeniorSecondary || !subject.departmentId || subject.departmentId === departmentId);
		if (applicableSubjects.length) await tx.studentSubjectEnrollment.createMany({
			data: applicableSubjects.map((classSubject) => ({ enrollmentId: enrollment.id, classSubjectId: classSubject.id })),
			skipDuplicates: true
		});

		await tx.admission.update({ where: { id }, data: {
			...(payload.desiredClassId ? { desiredClassId: schoolClass.id } : {}),
			...(payload.desiredDepartmentId !== undefined ? { desiredDepartmentId: departmentId } : {}),
			...(payload.reviewNotes !== undefined ? { reviewNotes: payload.reviewNotes } : {}),
			...(payload.reviewerId ? { reviewedBy: payload.reviewerId } : {}),
			status: "CONVERTED",
			convertedStudentId: student.id,
			reviewedAt: new Date(),
		} });
		return { ...student, enrollment };
	});

	let communication = { email: false, errors: [] };
	if (email) {
		try {
			const result = await sendApprovalEmail({
				to: email,
				name: fullName,
				username: email,
				role: "STUDENT",
				registrationNumber: student.registrationNumber,
				classOrProgramme: student.currentClass?.name
			});
			if (!result?.success) throw new Error("The mailer did not accept the enrollment confirmation email.");
			communication.email = true;
			communication.messageId = result.messageId;
		} catch (error) {
			communication.errors.push("Enrollment completed, but the confirmation email was not accepted by SMTP.");
			console.error("[Student Enrollment Email Error]:", error.message);
		}
	}

	return { ...student, communication };
};

module.exports = { create, getAll, getById, update, convertToStudent };
