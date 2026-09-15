const { prisma } = require("../../config/database");
const { hashPassword } = require("../../core/utils/hash");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./parent.repository");
const getById = async (id) => { const parent = await repository.findById(id); if (!parent) throw new NotFoundError("Parent not found"); return parent; };
const create = async (data, schoolId) => {
	if (data.email && await repository.findUserByEmail(data.email.toLowerCase())) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
	return prisma.$transaction(async (tx) => {
		const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ");
		const user = await tx.user.create({ data: { schoolId: schoolId || null, fullName, email: data.email?.toLowerCase() || null, phoneNumber: data.phoneNumber || null, passwordHash: await hashPassword(data.password || `${data.firstName}123!`), role: "PARENT", status: "ACTIVE" } });
		return tx.parent.create({ data: { userId: user.id, firstName: data.firstName, middleName: data.middleName || null, lastName: data.lastName, occupation: data.occupation || null, address: data.address || null, relationship: data.relationship || null, emergencyContact: data.emergencyContact || null }, include: { parentLinks: true } });
	});
};
const linkStudent = async (parentId, data) => { await getById(parentId); if (!await repository.findStudent(data.studentId)) throw new NotFoundError("Student not found"); if (await repository.findLink(parentId, data.studentId)) throw new AppError("This student is already linked to the parent.", 409, "PARENT_STUDENT_EXISTS"); return repository.createLink({ parentId, ...data }); };
const unlinkStudent = async (parentId, studentId) => { await getById(parentId); if (!await repository.findLink(parentId, studentId)) throw new NotFoundError("Parent-student link not found"); return repository.deleteLink(parentId, studentId); };
module.exports = { create, getById, getAll: repository.findAll, linkStudent, unlinkStudent };
