const { prisma } = require("../../config/database");

const findStaffById = (id) => prisma.staff.findUnique({
	where: { id },
	include: { user: { select: { status: true, role: true } } },
});
const findStaffByUserId = (userId) => prisma.staff.findUnique({ where: { userId }, select: { id: true } });
const findClassById = (id) => prisma.class.findUnique({ where: { id } });
const findClassesWithSubject = (subjectId, classLevel) => prisma.classSubject.findMany({
	where: {
		subjectId,
		class: {
			isActive: true,
			classLevel: classLevel === "BOTH"
				? { OR: [{ code: { startsWith: "JSS" } }, { code: { startsWith: "SS" } }] }
				: { code: { startsWith: classLevel === "SSS" ? "SS" : "JSS" } }
		}
	},
	select: { class: { include: { classLevel: true } } },
	orderBy: [{ class: { classLevel: { code: "asc" } } }, { class: { name: "asc" } }]
});
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findSubjectById = (id) => prisma.subject.findUnique({ where: { id } });
const findClassSubject = (classId, subjectId) => prisma.classSubject.findUnique({ where: { classId_subjectId: { classId, subjectId } } });

const findDuplicate = (data) => prisma.teacherAssignment.findFirst({
	where: {
		classId: data.classId,
		subjectId: data.subjectId,
		staffId: data.staffId,
		sessionId: data.sessionId,
		termId: data.termId,
	},
});
const create = (data) => prisma.teacherAssignment.create({ data, include: { staff: true, subject: true, class: { include: { classLevel: true } } } });
const createForClasses = async (assignments) => prisma.$transaction(async (tx) => {
	const result = await tx.teacherAssignment.createMany({ data: assignments, skipDuplicates: true });
	const rows = await tx.teacherAssignment.findMany({
		where: {
			staffId: assignments[0].staffId,
			subjectId: assignments[0].subjectId,
			classId: { in: assignments.map((assignment) => assignment.classId) },
			sessionId: assignments[0].sessionId,
			termId: assignments[0].termId
		},
		include: { staff: true, subject: true, class: { include: { classLevel: true } } }
	});
	return { count: result.count, assignments: rows, createdCount: result.count };
});
const findAll = (filters) => prisma.teacherAssignment.findMany({ where: filters, include: { staff: true, subject: true, class: { include: { classLevel: true } } }, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.teacherAssignment.findUnique({ where: { id }, include: { staff: true, subject: true, class: { include: { classLevel: true } } } });
const remove = (id) => prisma.teacherAssignment.delete({ where: { id } });

const findClassTeacherAssignment = (id) => prisma.classTeacherAssignment.findUnique({
	where: { id },
	include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true }
});
const findClassTeacherAssignments = (filters) => prisma.classTeacherAssignment.findMany({
	where: filters,
	include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true },
	orderBy: [{ session: { startDate: "desc" } }, { class: { name: "asc" } }]
});
const findClassTeacherAssignmentByClassSession = (classId, sessionId) => prisma.classTeacherAssignment.findUnique({ where: { classId_sessionId: { classId, sessionId } } });
const saveClassTeacherAssignment = (data) => prisma.classTeacherAssignment.create({
	data,
	include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true }
});
const removeClassTeacherAssignment = (id) => prisma.classTeacherAssignment.delete({ where: { id } });

module.exports = {
	findStaffById, findStaffByUserId, findSession, findTerm, findClassById, findClassesWithSubject, findSubjectById, findClassSubject, findDuplicate, create, createForClasses, findAll, findById, remove,
	findClassTeacherAssignment, findClassTeacherAssignments, findClassTeacherAssignmentByClassSession,
	saveClassTeacherAssignment, removeClassTeacherAssignment
};