const { prisma } = require("../../config/database");
const include = { student: { include: { user: true } }, session: true, term: true, class: { include: { classLevel: true } }, department: true, subjectRegistrations: { include: { classSubject: { include: { subject: { include: { department: true } } } } } } };
const findStudent = (id) => prisma.student.findUnique({ where: { id } });
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findClass = (id) => prisma.class.findUnique({ where: { id }, include: { classLevel: true } });
const findDuplicate = (studentId, sessionId, termId) => prisma.enrollment.findUnique({ where: { studentId_sessionId_termId: { studentId, sessionId, termId } } });
const create = (data) => prisma.enrollment.create({ data, include });
const findAll = (filters) => prisma.enrollment.findMany({ where: filters, include, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.enrollment.findUnique({ where: { id }, include });
const update = (id, data) => prisma.enrollment.update({ where: { id }, data, include });
const updateStudentPlacement = (studentId, data) => prisma.student.update({ where: { id: studentId }, data });
const findDepartment = (id) => prisma.department.findUnique({ where: { id } });
const findClassSubjects = (classId) => prisma.classSubject.findMany({ where: { classId, subject: { isActive: true } }, include: { subject: true } });
const replaceSubjectRegistrations = (enrollmentId, classSubjectIds) => prisma.$transaction(async (tx) => {
	await tx.studentSubjectEnrollment.deleteMany({ where: { enrollmentId } });
	if (classSubjectIds.length) await tx.studentSubjectEnrollment.createMany({ data: classSubjectIds.map((classSubjectId) => ({ enrollmentId, classSubjectId })) });
	return tx.studentSubjectEnrollment.findMany({ where: { enrollmentId }, include: { classSubject: { include: { subject: true } } } });
});
const createWithSubjectRegistrations = (data, classSubjectIds) => prisma.$transaction(async (tx) => {
	const enrollment = await tx.enrollment.create({ data, include });
	if (classSubjectIds.length) await tx.studentSubjectEnrollment.createMany({ data: classSubjectIds.map((classSubjectId) => ({ enrollmentId: enrollment.id, classSubjectId })) });
	await tx.student.update({ where: { id: data.studentId }, data: { currentClassId: data.classId, currentSessionId: data.sessionId, currentTerm: data.currentTerm } });
	return tx.enrollment.findUnique({ where: { id: enrollment.id }, include });
});
module.exports = { findStudent, findSession, findTerm, findClass, findDuplicate, create, findAll, findById, update, updateStudentPlacement, findDepartment, findClassSubjects, replaceSubjectRegistrations, createWithSubjectRegistrations };
