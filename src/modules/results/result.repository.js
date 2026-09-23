const { prisma } = require("../../config/database");
const include = { student: true, exam: { include: { subject: true, class: true } }, session: true, term: true };
const findById = (id) => prisma.result.findUnique({ where: { id }, include });
const findStudentByUserId = (userId) => prisma.student.findUnique({ where: { userId }, select: { id: true } });
const findForStudent = (studentId, publishedOnly) => prisma.result.findMany({ where: { studentId, ...(publishedOnly ? { published: true } : {}) }, include, orderBy: { generatedAt: "desc" } });
const findAll = (where) => prisma.result.findMany({ where, include, orderBy: { generatedAt: "desc" } });
const findForTeacher = async (userId, filters = {}) => {
	const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
	if (!staff) return [];
	const assignments = await prisma.teacherAssignment.findMany({ where: { staffId: staff.id }, select: { classId: true, subjectId: true } });
	if (!assignments.length) return [];
	return prisma.result.findMany({ where: { ...filters, OR: assignments.map(({ classId, subjectId }) => ({ exam: { classId, subjectId } })) }, include, orderBy: { generatedAt: "desc" } });
};
const update = (id, data) => prisma.result.update({ where: { id }, data, include });
module.exports = { findById, findStudentByUserId, findForStudent, findAll, findForTeacher, update };
