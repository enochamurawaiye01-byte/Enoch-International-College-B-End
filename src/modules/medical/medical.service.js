const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./medical.repository");
const { MEDICAL_ERRORS: ERRORS } = require("./medical.constants");
const saveProfile = async (data) => { if (!await repository.findStudent(data.studentId)) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND); return repository.upsertProfile(data); };
const getProfile = async (studentId) => { const profile = await repository.findProfile(studentId); if (!profile) throw new NotFoundError(ERRORS.PROFILE_NOT_FOUND); return profile; };
const createVisit = async (data, recordedBy) => { if (!await repository.findStudent(data.studentId)) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND); return repository.createVisit({ ...data, recordedBy, incidentDate: data.incidentDate || new Date() }); };
const getVisits = (studentId) => repository.findVisits(studentId);
module.exports = { saveProfile, getProfile, createVisit, getVisits };
