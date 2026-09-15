const { prisma } = require("../../config/database");
const include = { student: true, exam: { include: { subject: true, class: true } }, session: true, term: true };
const findById = (id) => prisma.result.findUnique({ where: { id }, include });
const findStudentByUserId = (userId) => prisma.student.findUnique({ where: { userId }, select: { id: true } });
const findForStudent = (studentId, publishedOnly) => prisma.result.findMany({ where: { studentId, ...(publishedOnly ? { published: true } : {}) }, include, orderBy: { generatedAt: "desc" } });
const findAll = (where) => prisma.result.findMany({ where, include, orderBy: { generatedAt: "desc" } });
const update = (id, data) => prisma.result.update({ where: { id }, data, include });
module.exports = { findById, findStudentByUserId, findForStudent, findAll, update };
