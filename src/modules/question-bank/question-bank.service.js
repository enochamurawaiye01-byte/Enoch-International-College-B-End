const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./question-bank.repository");
const create = async (data) => { const exam = await repository.findExam(data.examId); if (!exam) throw new NotFoundError("Exam not found"); if (["CLOSED", "MARKED", "ARCHIVED"].includes(exam.status)) throw new AppError("Questions cannot be changed after exam closure.", 409, "EXAM_LOCKED"); const marks = data.marks ?? Number(exam.defaultQuestionMark || 1); return repository.create({ examId: data.examId, questionText: data.questionText, marks, explanation: data.explanation || null, options: { create: data.options } }); };
const getAll = (examId) => repository.findAll(examId);
const getById = async (id, includeCorrectAnswers = false) => { const question = await repository.findById(id, includeCorrectAnswers); if (!question) throw new NotFoundError("Question not found"); return question; };
const update = async (id, data) => { const question = await getById(id); if (["CLOSED", "MARKED", "ARCHIVED"].includes(question.exam.status)) throw new AppError("Questions cannot be changed after exam closure.", 409, "EXAM_LOCKED"); const updateData = {}; ["questionText", "marks", "explanation"].forEach((key) => { if (data[key] !== undefined) updateData[key] = data[key]; }); return repository.update(id, updateData); };
const remove = async (id) => { const question = await getById(id); if (["CLOSED", "MARKED", "ARCHIVED"].includes(question.exam.status)) throw new AppError("Questions cannot be changed after exam closure.", 409, "EXAM_LOCKED"); return repository.remove(id); };
module.exports = { create, getAll, getById, update, remove };
