const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./discipline.repository");
const { DISCIPLINE_ERRORS: ERRORS } = require("./discipline.constants");
const create = async (data, reportedBy) => { if (!await repository.findStudent(data.studentId)) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND); return repository.create({ ...data, reportedBy, status: data.status || "OPEN", incidentDate: data.incidentDate || new Date() }); };
const getAll = (query) => repository.findAll(query.studentId ? { studentId: query.studentId } : undefined);
const getById = async (id) => { const item = await repository.findById(id); if (!item) throw new NotFoundError(ERRORS.INCIDENT_NOT_FOUND); return item; };
const resolve = async (id, data) => { await getById(id); return repository.resolve(id, data); };
module.exports = { create, getAll, getById, resolve };
