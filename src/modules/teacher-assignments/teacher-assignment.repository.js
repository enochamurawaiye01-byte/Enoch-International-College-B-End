const { prisma } = require("../../config/database");

const findStaffById = (id) => prisma.staff.findUnique({ where: { id } });
const findClassById = (id) => prisma.class.findUnique({ where: { id } });
const findSubjectById = (id) => prisma.subject.findUnique({ where: { id } });
const findClassSubject = (classId, subjectId) => prisma.classSubject.findUnique({ where: { classId_subjectId: { classId, subjectId } } });

const findDuplicate = (data) => prisma.teacherAssignment.findFirst({
	where: {
		classId: data.classId,
		subjectId: data.subjectId,
		sessionId: data.sessionId,
		termId: data.termId,
	},
});
const create = (data) => prisma.teacherAssignment.create({ data, include: { staff: true, subject: true, class: { include: { classLevel: true } } } });
const findAll = (filters) => prisma.teacherAssignment.findMany({ where: filters, include: { staff: true, subject: true, class: { include: { classLevel: true } } }, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.teacherAssignment.findUnique({ where: { id }, include: { staff: true, subject: true, class: { include: { classLevel: true } } } });
const remove = (id) => prisma.teacherAssignment.delete({ where: { id } });

module.exports = { findStaffById, findClassById, findSubjectById, findClassSubject, findDuplicate, create, findAll, findById, remove };