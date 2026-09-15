const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./teacher-attendance.repository");
const { startOfDay } = require("./teacher-attendance.utils");
const isAdmin = (role) => ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(role);
const assertAccess = async (user, staffId) => {
	if (isAdmin(user.role)) return;
	const staff = await repository.findStaffByUserId(user.id);
	if (!staff || staff.id !== staffId) throw new AppError("You can only manage your own attendance.", 403, "ATTENDANCE_ACCESS_DENIED");
};
const validate = async (data) => {
	const [staff, term] = await Promise.all([repository.findStaff(data.staffId), repository.findTerm(data.termId)]);
	if (!staff) throw new NotFoundError("Staff member not found");
	if (!term) throw new NotFoundError("Term not found");
	return { staff, term };
};
const create = async (data, user) => {
	const normalized = { ...data, date: startOfDay(data.date) };
	await assertAccess(user, normalized.staffId);
	await validate(normalized);
	if (await repository.findDuplicate(normalized.staffId, normalized.date)) throw new AppError("Attendance already exists for this staff member and date.", 409, "ATTENDANCE_EXISTS");
	return repository.create(normalized);
};
const getById = async (id, user) => {
	const record = await repository.findById(id);
	if (!record) throw new NotFoundError("Teacher attendance record not found");
	await assertAccess(user, record.staffId);
	return record;
};
const update = async (id, data, user) => {
	await getById(id, user);
	return repository.update(id, { ...data, ...(data.date ? { date: startOfDay(data.date) } : {}) });
};
const getAll = async (query, user) => {
	const where = {};
	if (query.staffId) where.staffId = query.staffId;
	if (query.termId) where.termId = query.termId;
	if (query.date) where.date = startOfDay(query.date);
	if (!isAdmin(user.role)) {
		const staff = await repository.findStaffByUserId(user.id);
		if (!staff) return [];
		where.staffId = staff.id;
	}
	return repository.findAll(where);
};
module.exports = { create, getById, update, getAll };
