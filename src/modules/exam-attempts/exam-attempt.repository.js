const { prisma } = require("../../config/database");
const findStudentByUserId = (userId) => prisma.student.findUnique({ where: { userId } });
const findExam = (id) => prisma.exam.findUnique({ where: { id }, include: { questions: { include: { options: true }, orderBy: { createdAt: "asc" } } } });
const findAttempt = (studentId, examId) => prisma.examAttempt.findUnique({ where: { studentId_examId: { studentId, examId } }, include: { exam: { include: { questions: { include: { options: true } } } }, answers: true } });
const findAttemptById = (id, studentId) => prisma.examAttempt.findFirst({ where: { id, studentId }, include: { exam: { include: { questions: { include: { options: true } } } }, answers: true } });
const createAttempt = (data) => prisma.examAttempt.create({ data });
const saveSubmission = (attemptId, data) => prisma.$transaction(async (tx) => {
	await tx.studentAnswer.deleteMany({ where: { attemptId } });
	if (data.answers.length > 0) await tx.studentAnswer.createMany({ data: data.answers });
	const attempt = await tx.examAttempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date(), score: data.score, percentage: data.percentage } });
	const result = await tx.result.upsert({ where: { examAttemptId: attemptId }, update: { score: data.score, percentage: data.percentage, status: data.resultStatus, published: data.published }, create: { studentId: data.studentId, examId: data.examId, examAttemptId: attemptId, sessionId: data.sessionId, termId: data.termId, score: data.score, totalMarks: data.totalMarks, percentage: data.percentage, status: data.resultStatus, published: data.published } });
	return { attempt, result };
});
module.exports = { findStudentByUserId, findExam, findAttempt, findAttemptById, createAttempt, saveSubmission };
