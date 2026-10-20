const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./attendance.repository");
const { startOfDay } = require("./attendance.utils");

const isAdmin = (role) => ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(role);
const isClassTeacher = (staff) => staff?.user?.role === "CLASS_TEACHER"
	|| staff?.user?.roleAssignments?.some(({ role }) => role.name === "CLASS_TEACHER");

const validateReferences = async (data) => {
	const [student, session, term, enrollment] = await Promise.all([repository.findStudent(data.studentId), repository.findSession(data.sessionId), repository.findTerm(data.termId), repository.findEnrollment(data.studentId, data.sessionId, data.termId)]);
	if (!student) throw new NotFoundError("Student not found");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	if (!enrollment || enrollment.status !== "ACTIVE") throw new AppError("Student is not actively enrolled for this term.", 409, "STUDENT_NOT_ENROLLED");
	return { student, enrollment };
};

const assertTeacherAccess = async (user, classId, sessionId, termId) => {
	if (isAdmin(user.role)) return;
	if (!classId) throw new AppError("Attendance is not associated with a class.", 403, "CLASS_ASSIGNMENT_REQUIRED");
	const staff = await repository.findStaffByUserId(user.userId || user.id);
	if (!staff) throw new AppError("Only assigned teachers or administrators can manage attendance.", 403, "ATTENDANCE_ACCESS_DENIED");
	if (isClassTeacher(staff)) {
		if (await repository.findClassTeacherAssignment(staff.id, classId, sessionId)) return;
		if (staff.user.role === "CLASS_TEACHER"
			|| staff.user.roleAssignments?.some(({ role }) => role.name === "CLASS_TEACHER")) {
			throw new AppError("You are not assigned as this class's teacher for the selected session.", 403, "CLASS_ASSIGNMENT_REQUIRED");
		}
	}
	if (user.role === "CLASS_TEACHER") {
		throw new AppError("You are not assigned as this class's teacher for the selected session.", 403, "CLASS_ASSIGNMENT_REQUIRED");
	}
	if (user.role !== "TEACHER" || !(await repository.findAssignment(staff.id, classId, sessionId, termId))) {
		throw new AppError("You are not assigned to this student's class.", 403, "CLASS_ASSIGNMENT_REQUIRED");
	}
};

const create = async (data, user) => {
	const normalized = { ...data, date: startOfDay(data.date) };
	const { enrollment } = await validateReferences(normalized);
	await assertTeacherAccess(user, enrollment.classId, normalized.sessionId, normalized.termId);
	if (await repository.findDuplicate(normalized.studentId, normalized.date)) throw new AppError("Attendance already exists for this student and date.", 409, "ATTENDANCE_EXISTS");
	return repository.create({ ...normalized, classId: enrollment.classId });
};

const getRoster = async (query, user) => {
	const [schoolClass, session, term] = await Promise.all([
		repository.findClassById(query.classId),
		repository.findSession(query.sessionId),
		repository.findTerm(query.termId),
	]);
	if (!schoolClass) throw new NotFoundError("Class not found");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	await assertTeacherAccess(user, query.classId, query.sessionId, query.termId);

	const enrollments = await repository.findActiveClassRoster(query.classId, query.sessionId, query.termId);
	const studentIds = enrollments.map(({ studentId }) => studentId);
	const date = startOfDay(query.date);
	const savedRecords = await repository.findRosterAttendance(studentIds, query.classId, query.sessionId, query.termId, date);
	const statusByStudent = new Map(savedRecords.map(({ studentId, status }) => [studentId, status]));
	return {
		class: schoolClass,
		session,
		term,
		date,
		students: enrollments.map(({ student }) => ({
			...student,
			status: statusByStudent.get(student.id) || null,
		})),
	};
};

const getById = async (id, user) => {
	const attendance = await repository.findById(id);
	if (!attendance) throw new NotFoundError("Attendance record not found");
	if (!isAdmin(user.role)) {
		const enrollment = attendance.classId ? null : await repository.findEnrollment(attendance.studentId, attendance.sessionId, attendance.termId);
		await assertTeacherAccess(user, attendance.classId || enrollment?.classId || attendance.student?.currentClassId, attendance.sessionId, attendance.termId);
	}
	return attendance;
};

const update = async (id, data, user) => {
	const existing = await getById(id, user);
	return repository.update(id, { ...data, ...(data.date ? { date: startOfDay(data.date) } : {}) });
};

const getAll = async (query, user) => {
	if (!isAdmin(user.role) && !["TEACHER", "CLASS_TEACHER"].includes(user.role)
		&& !(await repository.findEffectiveTeachingRoles(user.userId || user.id))
			.has("CLASS_TEACHER")) {
		throw new AppError("Only assigned teachers or administrators can view attendance.", 403, "ATTENDANCE_ACCESS_DENIED");
	}
	const where = {};
	if (query.studentId) where.studentId = query.studentId;
	if (query.classId) where.classId = query.classId;
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;
	if (query.date) { const date = startOfDay(query.date); where.date = date; }
	if (query.from || query.to) where.date = { ...(query.from ? { gte: startOfDay(query.from) } : {}), ...(query.to ? { lte: startOfDay(query.to) } : {}) };
	if (!isAdmin(user.role)) {
		const userId = user.userId || user.id;
		const [classTeacherClassIds, subjectTeacherClassIds] = await Promise.all([
			repository.findClassTeacherClassIds(userId, query.sessionId),
			repository.findTeacherClassIds(userId, query.sessionId, query.termId)
		]);
		const classIds = [...new Set([...(classTeacherClassIds || []), ...(subjectTeacherClassIds || [])])];
		if (!classIds?.length) return [];
		where.classId = query.classId
			? (classIds.includes(query.classId) ? query.classId : { in: [] })
			: { in: classIds };
	}
	return repository.findAll(where);
};

const summary = async (query, user) => {
	const records = await getAll(query, user);
	const counts = records.reduce((result, record) => { result[record.status] = (result[record.status] || 0) + 1; return result; }, {});
	return { total: records.length, counts, percentage: records.length ? Number((((counts.PRESENT || 0) + (counts.LATE || 0) + (counts.HALF_DAY || 0) * 0.5) / records.length * 100).toFixed(2)) : 0 };
};

const batchCreate = async (data, user) => {
	const date = startOfDay(data.date);
	const [schoolClass, session, term] = await Promise.all([
		repository.findClassById(data.classId),
		repository.findSession(data.sessionId),
		repository.findTerm(data.termId),
	]);
	if (!schoolClass) throw new NotFoundError("Class not found");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	await assertTeacherAccess(user, data.classId, data.sessionId, data.termId);

	const studentIds = data.records.map(({ studentId }) => studentId);
	if (new Set(studentIds).size !== studentIds.length) throw new AppError("Each student can only be marked once per batch.", 400, "DUPLICATE_STUDENT");
	const enrollments = await repository.findEnrollments(studentIds, data.sessionId, data.termId);
	const enrolledStudentIds = new Set(enrollments
		.filter((enrollment) => enrollment.status === "ACTIVE" && enrollment.classId === data.classId)
		.map(({ studentId }) => studentId));
	if (enrolledStudentIds.size !== studentIds.length) {
		throw new AppError("Every student must be actively enrolled in the selected class, session, and term.", 409, "STUDENT_NOT_ENROLLED");
	}

	const records = data.records.map((record) => ({
		studentId: record.studentId,
		classId: data.classId,
		sessionId: data.sessionId,
		termId: data.termId,
		date,
		status: record.status,
		remarks: record.remarks ?? null,
	}));
	return repository.saveMany(records);
};

module.exports = { create, batchCreate, getRoster, getById, update, getAll, summary };
