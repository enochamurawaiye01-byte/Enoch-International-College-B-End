const { prisma } = require("../../config/database");
const include = { student: { include: { user: { select: { id: true, fullName: true, role: true } } } } };
const findStudent = (id) => prisma.student.findUnique({ where: { id } });
const findStudentByUserId = (userId) => prisma.student.findUnique({ where: { userId } });
const create = (data) => prisma.studentDocument.create({ data, include });
const findById = (id) => prisma.studentDocument.findUnique({ where: { id }, include });
const findAll = (where) => prisma.studentDocument.findMany({ where, include, orderBy: { uploadedAt: "desc" } });
const remove = (id) => prisma.studentDocument.delete({ where: { id } });
module.exports = { findStudent, findStudentByUserId, create, findById, findAll, remove };
