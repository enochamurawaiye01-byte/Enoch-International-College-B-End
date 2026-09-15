const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./enrollment.repository");
const validateReferences = async (data) => {
	const [student, session, term, schoolClass] = await Promise.all([repository.findStudent(data.studentId), repository.findSession(data.sessionId), repository.findTerm(data.termId), repository.findClass(data.classId)]);
	if (!student) throw new NotFoundError("Student not found");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (!schoolClass || !schoolClass.isActive) throw new NotFoundError("Active class not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
};
const create = async (data) => { await validateReferences(data); if (await repository.findDuplicate(data.studentId, data.sessionId, data.termId)) throw new AppError("Student is already enrolled for this session and term.", 409, "ENROLLMENT_EXISTS"); const enrollment = await repository.create({ ...data, status: data.status || "ACTIVE", enrollmentDate: new Date() }); await repository.updateStudentPlacement(data.studentId, { currentClassId: data.classId, currentSessionId: data.sessionId }); return enrollment; };
const getAll = (query) => { const filters = {}; ["studentId", "sessionId", "termId", "classId", "status"].forEach((key) => { if (query[key]) filters[key] = query[key]; }); return repository.findAll(filters); };
const getById = async (id) => { const enrollment = await repository.findById(id); if (!enrollment) throw new NotFoundError("Enrollment not found"); return enrollment; };
const update = async (id, data) => { await getById(id); const updateData = { status: data.status }; if (data.completionDate !== undefined) updateData.completionDate = data.completionDate; else if (data.status === "COMPLETED") updateData.completionDate = new Date(); return repository.update(id, updateData); };
module.exports = { create, getAll, getById, update };
