const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./attendance.repository");
const { startOfDay } = require("./attendance.utils");

const isAdmin = (role) => ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(role);

const validateReferences = async (data) => {
	const [student, session, term, enrollment] = await Promise.all([repository.findStudent(data.studentId), repository.findSession(data.sessionId), repository.findTerm(data.termId), repository.findEnrollment(data.studentId, data.sessionId, data.termId)]);
	if (!student) throw new NotFoundError("Student not found");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	if (!enrollment || enrollment.status !== "ACTIVE") throw new AppError("Student is not actively enrolled for this term.", 409, "STUDENT_NOT_ENROLLED");
	return student;
};

const assertTeacherAccess = async (user, student, sessionId, termId) => {
	if (isAdmin(user.role)) return;
	if (user.role !== "TEACHER") throw new AppError("Only assigned teachers or administrators can manage attendance.", 403, "ATTENDANCE_ACCESS_DENIED");
	if (!student.currentClassId || !(await repository.findAssignment((await repository.findStaffByUserId(user.id))?.id, student.currentClassId, sessionId, termId))) throw new AppError("You are not assigned to this student's class.", 403, "CLASS_ASSIGNMENT_REQUIRED");
};

const create = async (data, user) => {
	const normalized = { ...data, date: startOfDay(data.date) };
	const student = await validateReferences(normalized);
	await assertTeacherAccess(user, student, normalized.sessionId, normalized.termId);
	if (await repository.findDuplicate(normalized.studentId, normalized.date)) throw new AppError("Attendance already exists for this student and date.", 409, "ATTENDANCE_EXISTS");
	return repository.create(normalized);
};

const getById = async (id, user) => {
	const attendance = await repository.findById(id);
	if (!attendance) throw new NotFoundError("Attendance record not found");
	await assertTeacherAccess(user, attendance.student, attendance.sessionId, attendance.termId);
	return attendance;
};

const update = async (id, data, user) => {
	const existing = await getById(id, user);
	return repository.update(id, { ...data, ...(data.date ? { date: startOfDay(data.date) } : {}) });
};

const getAll = async (query, user) => {
	const where = {};
	if (query.studentId) where.studentId = query.studentId;
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;
	if (query.date) { const date = startOfDay(query.date); where.date = date; }
	if (query.from || query.to) where.date = { ...(query.from ? { gte: startOfDay(query.from) } : {}), ...(query.to ? { lte: startOfDay(query.to) } : {}) };
	if (user.role === "TEACHER") {
		const classIds = await repository.findTeacherClassIds(user.id, query.sessionId, query.termId);
		if (!classIds?.length) return [];
		where.student = { currentClassId: { in: classIds } };
	}
	return repository.findAll(where);
};

const summary = async (query, user) => {
	const records = await getAll(query, user);
	const counts = records.reduce((result, record) => { result[record.status] = (result[record.status] || 0) + 1; return result; }, {});
	return { total: records.length, counts, percentage: records.length ? Number((((counts.PRESENT || 0) + (counts.LATE || 0) + (counts.HALF_DAY || 0) * 0.5) / records.length * 100).toFixed(2)) : 0 };
};

module.exports = { create, getById, update, getAll, summary };
