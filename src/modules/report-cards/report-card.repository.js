const { prisma } = require("../../config/database");
const include = {
	student: { include: { user: true, currentClass: { include: { classLevel: true } } } },
	session: true,
	term: true,
	class: { include: { classLevel: true } },
	entries: { include: { subject: true, teacher: true } }
};
const findById = (id) => prisma.reportCard.findUnique({ where: { id }, include });
const findExisting = (studentId, sessionId, termId) => prisma.reportCard.findUnique({ where: { studentId_sessionId_termId: { studentId, sessionId, termId } }, include });
const findStudent = (id, client = prisma) => client.student.findUnique({ where: { id }, include: { user: true, currentClass: { include: { classLevel: true } } } });
const findEnrollment = (studentId, sessionId, termId) => prisma.enrollment.findUnique({
	where: { studentId_sessionId_termId: { studentId, sessionId, termId } },
	include: {
		class: { include: { classLevel: true } },
		subjectRegistrations: { include: { classSubject: { include: { subject: true } } } },
	},
});
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findSubject = (id) => prisma.subject.findUnique({ where: { id } });
const upsert = (where, data) => prisma.reportCard.upsert({ where, update: data, create: data, include });
const update = (id, data) => prisma.reportCard.update({ where: { id }, data, include });
const findAll = (where) => prisma.reportCard.findMany({ where, include, orderBy: { updatedAt: "desc" } });
const findClass = (id) => prisma.class.findUnique({ where: { id }, include: { classLevel: true } });
const findEnrollmentRoster = (classId, sessionId, termId) => prisma.enrollment.findMany({
	where: { classId, sessionId, termId, status: "ACTIVE", student: { status: "ACTIVE" } },
	include: { student: { include: { user: true, currentClass: { include: { classLevel: true } } } }, subjectRegistrations: { include: { classSubject: true } } },
	orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }]
});
const findClassSubject = (classId, subjectId) => prisma.classSubject.findUnique({
	where: { classId_subjectId: { classId, subjectId } },
	include: { subject: { include: { department: true } } }
});
const findStaffByUserId = (userId) => prisma.staff.findUnique({ where: { userId }, select: { id: true, status: true } });
const findTeacherAssignment = (filters) => prisma.teacherAssignment.findFirst({ where: filters, select: { id: true } });
const findConfiguration = (scopeKey) => prisma.assessmentConfiguration.findUnique({ where: { scopeKey } });
const saveConfiguration = (scopeKey, schoolId, updatedById, data) => prisma.assessmentConfiguration.upsert({
	where: { scopeKey },
	update: { ...data, updatedById },
	create: { scopeKey, schoolId: schoolId || null, ...data, updatedById }
});
module.exports = {
	findById, findExisting, findStudent, findEnrollment, findSession, findTerm, findSubject, upsert, update, findAll,
	findClass, findEnrollmentRoster, findClassSubject, findStaffByUserId, findTeacherAssignment,
	findConfiguration, saveConfiguration
};
