const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./examination.repository");
const create = async (data, user) => {
	if (user?.role === "TEACHER") {
		const staff = await repository.findStaffByUserId(user.userId);
		if (!staff || !(await repository.findAssignment(staff.id, data.classId, data.subjectId, data.sessionId, data.termId))) throw new AppError("You are not assigned to this class and subject.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
	}
	const [session, term, schoolClass, subject] = await repository.findReferences(data);
	if (!session || !term || !schoolClass || !subject) throw new NotFoundError("Exam session, term, class, and subject must exist.");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	if (!schoolClass.isActive || !subject.isActive) throw new AppError("Class and subject must be active.", 409, "INACTIVE_EXAM_REFERENCE");
	if (data.startTime && data.endTime && data.endTime <= data.startTime) throw new AppError("Exam end time must be after start time.", 400, "INVALID_EXAM_TIME");
	return repository.create({ ...data, totalMarks: data.totalMarks, passMark: data.passMark, questionsPerStudent: data.questionsPerStudent ?? null, defaultQuestionMark: data.defaultQuestionMark ?? null, status: "DRAFT" });
};
const getAll = (query) => { const where = {}; ["sessionId", "termId", "classId", "subjectId", "status"].forEach((key) => { if (query[key]) where[key] = query[key]; }); return repository.findAll(where); };
const getById = async (id) => { const exam = await repository.findById(id); if (!exam) throw new NotFoundError("Exam not found"); return exam; };
const update = async (id, data) => { const exam = await getById(id); if (["CLOSED", "MARKED", "ARCHIVED"].includes(exam.status) && data.status !== exam.status) throw new AppError("Closed exams cannot be edited.", 409, "EXAM_LOCKED"); if (data.startTime && data.endTime && data.endTime <= data.startTime) throw new AppError("Exam end time must be after start time.", 400, "INVALID_EXAM_TIME"); return repository.update(id, data); };
module.exports = { create, getAll, getById, update };
