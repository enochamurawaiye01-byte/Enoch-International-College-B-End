const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./result.repository");
const getById = async (id) => { const result = await repository.findById(id); if (!result) throw new NotFoundError("Result not found"); return result; };
const getStudentResults = (studentId, canSeeUnpublished) => repository.findForStudent(studentId, !canSeeUnpublished);
const getMyResults = async (userId) => { const student = await repository.findStudentByUserId(userId); return student ? repository.findForStudent(student.id, true) : []; };
const getAll = (query) => { const where = {}; ["studentId", "examId", "sessionId", "termId", "published"].forEach((key) => { if (query[key] !== undefined) where[key] = key === "published" ? query[key] === "true" : query[key]; }); return repository.findAll(where); };
const setPublished = async (id, published) => { await getById(id); return repository.update(id, { published }); };
module.exports = { getById, getStudentResults, getMyResults, getAll, setPublished };
