const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./exam-attempt.repository");

const shuffle = (items, seed) => {
	const result = [...items];
	let value = seed;
	for (let index = result.length - 1; index > 0; index -= 1) {
		value = (value * 9301 + 49297) % 233280;
		const target = Math.floor((value / 233280) * (index + 1));
		[result[index], result[target]] = [result[target], result[index]];
	}
	return result;
};
const seedFor = (studentId, examId) => [...`${studentId}${examId}`].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
const selectedQuestions = (exam, studentId) => {
	const questions = exam.shuffleQuestions ? shuffle(exam.questions, seedFor(studentId, exam.id)) : exam.questions;
	return exam.questionsPerStudent ? questions.slice(0, exam.questionsPerStudent) : questions;
};
const ensureWindow = (exam) => {
	const now = new Date();
	if (!["PUBLISHED", "ONGOING"].includes(exam.status)) throw new AppError("This exam is not open.", 409, "EXAM_NOT_OPEN");
	if (exam.startTime && now < exam.startTime) throw new AppError("This exam has not started.", 409, "EXAM_NOT_STARTED");
	if (exam.endTime && now > exam.endTime) throw new AppError("This exam has ended.", 409, "EXAM_ENDED");
};
const start = async (userId, examId) => {
	const student = await repository.findStudentByUserId(userId); if (!student) throw new NotFoundError("Student profile not found");
	const exam = await repository.findExam(examId); if (!exam) throw new NotFoundError("Exam not found"); ensureWindow(exam);
	let attempt = await repository.findAttempt(student.id, examId);
	if (attempt && attempt.status === "SUBMITTED") throw new AppError("This exam has already been submitted.", 409, "ATTEMPT_SUBMITTED");
	if (!attempt) attempt = await repository.createAttempt({ studentId: student.id, examId, status: "IN_PROGRESS", startedAt: new Date() });
	const selected = selectedQuestions(exam, student.id);
	return { attemptId: attempt.id, exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks, instructions: exam.instructions }, questions: selected.map(({ id, questionText, marks, options }) => ({ id, questionText, marks, options: options.map(({ id: optionId, optionKey, optionText }) => ({ id: optionId, optionKey, optionText })) })) };
};
const submit = async (userId, attemptId, answers) => {
	const student = await repository.findStudentByUserId(userId); if (!student) throw new NotFoundError("Student profile not found");
	const actualAttempt = await requireAttempt(attemptId, student.id);
	if (actualAttempt.status === "SUBMITTED") throw new AppError("This attempt is already submitted.", 409, "ATTEMPT_SUBMITTED");
	const exam = actualAttempt.exam;
	if (actualAttempt.startedAt && new Date() > new Date(actualAttempt.startedAt.getTime() + exam.durationMinutes * 60 * 1000)) throw new AppError("The exam duration has expired.", 409, "EXAM_TIME_EXPIRED");
	const selected = selectedQuestions(exam, student.id); const allowed = new Map(selected.map((question) => [question.id, question]));
	const submittedIds = new Set(); let score = 0; const storedAnswers = [];
	for (const answer of answers.items) {
		const question = allowed.get(answer.questionId); if (!question || submittedIds.has(question.id)) continue; submittedIds.add(question.id);
		const correct = question.options.length > 0 && question.options.some((option) => option.isCorrect && option.optionKey === answer.selectedAnswer);
		const marksAwarded = correct ? Number(question.marks) : 0; score += marksAwarded;
		storedAnswers.push({ attemptId: actualAttempt.id, questionId: question.id, studentId: student.id, selectedAnswer: answer.selectedAnswer, isCorrect: question.options.length > 0 ? correct : null, marksAwarded });
	}
	const percentage = Number(exam.totalMarks) ? (score / Number(exam.totalMarks)) * 100 : 0;
	return repository.saveSubmission(actualAttempt.id, { answers: storedAnswers, score, percentage, studentId: student.id, examId: exam.id, sessionId: exam.sessionId, termId: exam.termId, totalMarks: exam.totalMarks, resultStatus: score >= Number(exam.passMark) ? "PASS" : "FAIL", published: exam.resultsVisible });
};
const requireAttempt = async (attemptId, studentId) => { const attempt = await repository.findAttemptById(attemptId, studentId); if (!attempt) throw new NotFoundError("Exam attempt not found"); return attempt; };
module.exports = { start, submit };
