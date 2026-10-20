const { prisma } = require("../../config/database");

const include = { student: { include: { currentClass: { include: { classLevel: true } } } }, session: true, term: true };
const findStudent = (id) => prisma.student.findUnique({ where: { id }, include: { currentClass: true } });
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findEnrollment = (studentId, sessionId, termId) => prisma.enrollment.findUnique({ where: { studentId_sessionId_termId: { studentId, sessionId, termId } } });
const findEnrollments = (studentIds, sessionId, termId) => prisma.enrollment.findMany({
	where: { studentId: { in: studentIds }, sessionId, termId },
	select: { studentId: true, classId: true, status: true },
});
const findClassById = (id) => prisma.class.findUnique({ where: { id } });
const findActiveClassRoster = (classId, sessionId, termId) => prisma.enrollment.findMany({
	where: { classId, sessionId, termId, status: "ACTIVE", student: { status: "ACTIVE" } },
	select: {
		studentId: true,
		student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } },
	},
	orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
});
const findStaffByUserId = (userId) => prisma.staff.findUnique({ where: { userId } });
const findAssignment = (staffId, classId, sessionId, termId) => prisma.teacherAssignment.findFirst({ where: { staffId, classId, AND: [{ OR: [{ sessionId: null }, { sessionId }] }, { OR: [{ termId: null }, { termId }] }] } });
const findClassTeacherAssignment = (staffId, classId, sessionId) => prisma.classTeacherAssignment.findUnique({ where: { classId_sessionId: { classId, sessionId } }, select: { id: true, staffId: true } }).then((assignment) => assignment?.staffId === staffId ? assignment : null);
const findClassTeacherClassIds = async (userId, sessionId) => {
	const staff = await findStaffByUserId(userId);
	if (!staff) return [];
	const assignments = await prisma.classTeacherAssignment.findMany({
		where: { staffId: staff.id, ...(sessionId ? { sessionId } : {}) },
		select: { classId: true },
	});
	return assignments.map(({ classId }) => classId);
};
const findById = (id) => prisma.studentAttendance.findUnique({ where: { id }, include });
const findDuplicate = (studentId, date) => prisma.studentAttendance.findUnique({ where: { studentId_date: { studentId, date } } });
const findDuplicates = (studentIds, date) => prisma.studentAttendance.findMany({ where: { studentId: { in: studentIds }, date }, select: { studentId: true } });
const findRosterAttendance = (studentIds, classId, sessionId, termId, date) => studentIds.length
	? prisma.studentAttendance.findMany({
		where: { studentId: { in: studentIds }, classId, sessionId, termId, date },
		select: { studentId: true, status: true },
	})
	: Promise.resolve([]);
const create = (data) => prisma.studentAttendance.create({ data, include });
const saveMany = (records) => prisma.$transaction(async (tx) => {
	await Promise.all(records.map((record) => tx.studentAttendance.upsert({
		where: { studentId_date: { studentId: record.studentId, date: record.date } },
		create: record,
		update: {
			classId: record.classId,
			sessionId: record.sessionId,
			termId: record.termId,
			status: record.status,
			remarks: record.remarks
		}
	})));
	return tx.studentAttendance.findMany({ where: { date: records[0].date, studentId: { in: records.map(({ studentId }) => studentId) } }, include, orderBy: { createdAt: "asc" } });
});
const update = (id, data) => prisma.studentAttendance.update({ where: { id }, data, include });
const findAll = (where) => prisma.studentAttendance.findMany({ where, include, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
const findTeacherClassIds = async (userId, sessionId, termId) => {
	const staff = await findStaffByUserId(userId);
	if (!staff) return null;
	const assignments = await prisma.teacherAssignment.findMany({ where: { staffId: staff.id, AND: [{ OR: [{ sessionId: null }, { sessionId }] }, { OR: [{ termId: null }, { termId }] }] }, select: { classId: true } });
	return assignments.map((assignment) => assignment.classId);
};

module.exports = {
	findStudent, findSession, findTerm, findEnrollment, findEnrollments, findClassById,
	findActiveClassRoster, findRosterAttendance,
	findStaffByUserId, findAssignment, findClassTeacherAssignment, findClassTeacherClassIds,
	findById, findDuplicate, findDuplicates, create, saveMany, update, findAll, findTeacherClassIds,
};
