const { prisma } = require("../../config/database");
const include = { student: { include: { user: { select: { schoolId: true } } } }, exam: { include: { subject: true, class: true } }, session: true, term: true };
const findById = (id) => prisma.result.findUnique({ where: { id }, include });
const findStudentByUserId = (userId) => prisma.student.findUnique({ where: { userId }, select: { id: true } });
const findForStudent = (studentId, publishedOnly) => prisma.result.findMany({ where: { studentId, ...(publishedOnly ? { published: true } : {}) }, include, orderBy: { generatedAt: "desc" } });
const findAll = (where) => prisma.result.findMany({ where, include, orderBy: { generatedAt: "desc" } });
const findForTeacher = async (userId, filters = {}) => {
	const { schoolId, ...resultFilters } = filters;
	const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
	if (!staff) return [];
	const assignments = await prisma.teacherAssignment.findMany({
		where: {
			staffId: staff.id,
			AND: [
				...(resultFilters.sessionId ? [{ OR: [{ sessionId: null }, { sessionId: resultFilters.sessionId }] }] : []),
				...(resultFilters.termId ? [{ OR: [{ termId: null }, { termId: resultFilters.termId }] }] : [])
			]
		},
		select: { classId: true, subjectId: true, sessionId: true, termId: true }
	});
	const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
		where: {
			staffId: staff.id,
			session: { isActive: true, ...(schoolId ? { schoolId } : {}) },
			...(resultFilters.sessionId ? { sessionId: resultFilters.sessionId } : {})
		},
		select: { classId: true, sessionId: true }
	});
	if (!assignments.length && !classTeacherAssignments.length) return [];
	return prisma.result.findMany({ where: {
		...resultFilters,
		...(schoolId ? { session: { schoolId } } : {}),
		OR: [
		...assignments.map((assignment) => ({
			exam: { classId: assignment.classId, subjectId: assignment.subjectId },
			...(assignment.sessionId ? { sessionId: assignment.sessionId } : {}),
			...(assignment.termId ? { termId: assignment.termId } : {})
		})),
		...classTeacherAssignments.map((assignment) => ({
			exam: { classId: assignment.classId },
			sessionId: assignment.sessionId
		}))
		]
	}, include, orderBy: { generatedAt: "desc" } });
};
const update = (id, data) => prisma.result.update({ where: { id }, data, include });
module.exports = { findById, findStudentByUserId, findForStudent, findAll, findForTeacher, update };
