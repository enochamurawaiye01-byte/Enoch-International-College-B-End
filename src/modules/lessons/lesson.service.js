const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./lesson.repository");
const { isAdmin } = require("./lesson.utils");

const getById = async (id, user) => {
	const lesson = await repository.findById(id);
	if (!lesson) throw new NotFoundError("Lesson not found");
	await assertAccess(user, lesson);
	return lesson;
};

const validateReferences = async (data) => {
	const [staff, subject, schoolClass, session, term] = await Promise.all([repository.findStaff(data.staffId), repository.findSubject(data.subjectId), repository.findClass(data.classId), repository.findSession(data.sessionId), repository.findTerm(data.termId)]);
	if (!staff || staff.status !== "ACTIVE") throw new AppError("Active teacher staff record not found.", 404, "STAFF_NOT_FOUND");
	if (!subject || !subject.isActive) throw new AppError("Active subject not found.", 404, "SUBJECT_NOT_FOUND");
	if (!schoolClass || !schoolClass.isActive) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
};

const assertAccess = async (user, data) => {
	if (!isAdmin(user.role)) {
		if (user.role !== "TEACHER") throw new AppError("Only assigned teachers or administrators can manage lessons.", 403, "LESSON_ACCESS_DENIED");
		const staff = await repository.findStaffByUserId(user.id);
		if (!staff || staff.id !== data.staffId) throw new AppError("You can only manage your own lessons.", 403, "LESSON_ACCESS_DENIED");
		if (!(await repository.findAssignment(data.staffId, data.subjectId, data.classId, data.sessionId, data.termId))) throw new AppError("You are not assigned to this class and subject.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
	}
};

const create = async (data, user) => {
	await validateReferences(data);
	await assertAccess(user, data);
	return repository.create({ ...data, status: data.status || "DRAFT" });
};

const update = async (id, data, user) => {
	const existing = await getById(id, user);
	const next = { ...existing, ...data };
	await validateReferences(next);
	await assertAccess(user, next);
	const updateData = { ...data };
	delete updateData.staff;
	delete updateData.subject;
	delete updateData.class;
	delete updateData.session;
	delete updateData.term;
	return repository.update(id, updateData);
};

const getAll = async (query, user) => {
	const where = {};
	["staffId", "subjectId", "classId", "sessionId", "termId", "status"].forEach((key) => { if (query[key]) where[key] = query[key]; });
	if (query.from || query.to) where.lessonDate = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
	if (!isAdmin(user.role)) {
		const staff = await repository.findStaffByUserId(user.id);
		if (staff) where.staffId = staff.id;
	}
	return repository.findAll(where);
};

module.exports = { create, getById, update, getAll };
