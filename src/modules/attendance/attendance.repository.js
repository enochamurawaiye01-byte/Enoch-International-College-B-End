const { prisma } = require("../../config/database");

const include = { student: { include: { currentClass: { include: { classLevel: true } } } }, session: true, term: true };
const findStudent = (id) => prisma.student.findUnique({ where: { id }, include: { currentClass: true } });
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findEnrollment = (studentId, sessionId, termId) => prisma.enrollment.findUnique({ where: { studentId_sessionId_termId: { studentId, sessionId, termId } } });
const findStaffByUserId = (userId) => prisma.staff.findUnique({ where: { userId } });
const findAssignment = (staffId, classId, sessionId, termId) => prisma.teacherAssignment.findFirst({ where: { staffId, classId, AND: [{ OR: [{ sessionId: null }, { sessionId }] }, { OR: [{ termId: null }, { termId }] }] } });
const findById = (id) => prisma.studentAttendance.findUnique({ where: { id }, include });
const findDuplicate = (studentId, date) => prisma.studentAttendance.findUnique({ where: { studentId_date: { studentId, date } } });
const create = (data) => prisma.studentAttendance.create({ data, include });
const update = (id, data) => prisma.studentAttendance.update({ where: { id }, data, include });
const findAll = (where) => prisma.studentAttendance.findMany({ where, include, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
const findTeacherClassIds = async (userId, sessionId, termId) => {
	const staff = await findStaffByUserId(userId);
	if (!staff) return null;
	const assignments = await prisma.teacherAssignment.findMany({ where: { staffId: staff.id, AND: [{ OR: [{ sessionId: null }, { sessionId }] }, { OR: [{ termId: null }, { termId }] }] }, select: { classId: true } });
	return assignments.map((assignment) => assignment.classId);
};

module.exports = { findStudent, findSession, findTerm, findEnrollment, findStaffByUserId, findAssignment, findById, findDuplicate, create, update, findAll, findTeacherClassIds };
