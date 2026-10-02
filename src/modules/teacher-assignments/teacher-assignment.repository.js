const { prisma } = require("../../config/database");

const findStaffById = (id) => prisma.staff.findUnique({ where: { id } });
const findStaffByUserId = (userId) => prisma.staff.findUnique({ where: { userId }, select: { id: true } });
const findClassById = (id) => prisma.class.findUnique({ where: { id } });
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
const saveClassTeacherAssignment = (data) => prisma.classTeacherAssignment.upsert({
	where: { classId_sessionId: { classId: data.classId, sessionId: data.sessionId } },
	update: { staffId: data.staffId, assignedById: data.assignedById },
	create: data,
	include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true }
});
const removeClassTeacherAssignment = (id) => prisma.classTeacherAssignment.delete({ where: { id } });

module.exports = {
	findStaffById, findStaffByUserId, findSession, findTerm, findClassById, findSubjectById, findClassSubject, findDuplicate, create, findAll, findById, remove,
	findClassTeacherAssignment, findClassTeacherAssignments, findClassTeacherAssignmentByClassSession,
	saveClassTeacherAssignment, removeClassTeacherAssignment
};