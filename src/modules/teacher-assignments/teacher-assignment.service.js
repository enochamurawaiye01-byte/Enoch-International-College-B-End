const AppError = require("../../core/errors/AppError");
const repository = require("./teacher-assignment.repository");
const { hasPermission } = require("../../core/middleware/authorization.middleware");
const { TEACHER_ASSIGNMENT_ERRORS: ERRORS } = require("./teacher-assignment.constants");

const create = async (data) => {
    const [staff, schoolClass, subject, classSubject] = await Promise.all([
        repository.findStaffById(data.staffId),
        repository.findClassById(data.classId),
        repository.findSubjectById(data.subjectId),
        repository.findClassSubject(data.classId, data.subjectId),
    ]);
    if (!staff) throw new AppError(ERRORS.STAFF_NOT_FOUND, 404, "STAFF_NOT_FOUND");
    if (staff.status !== "ACTIVE") throw new AppError(ERRORS.STAFF_NOT_ACTIVE, 409, "STAFF_NOT_ACTIVE");
    if (!schoolClass) throw new AppError(ERRORS.CLASS_NOT_FOUND, 404, "CLASS_NOT_FOUND");
    if (!subject) throw new AppError(ERRORS.SUBJECT_NOT_FOUND, 404, "SUBJECT_NOT_FOUND");
    if (!classSubject) throw new AppError(ERRORS.SUBJECT_NOT_ASSIGNED_TO_CLASS, 409, "SUBJECT_NOT_ASSIGNED_TO_CLASS");
    const session = data.sessionId ? await repository.findSession(data.sessionId) : null;
    const term = data.termId ? await repository.findTerm(data.termId) : null;
    if (data.sessionId && !session) throw new AppError("Academic session not found.", 404, "SESSION_NOT_FOUND");
    if (data.termId && !term) throw new AppError("Term not found.", 404, "TERM_NOT_FOUND");
    if (term && session && term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");

    const assignmentData = { ...data, sessionId: data.sessionId || null, termId: data.termId || null };
    if (await repository.findDuplicate(assignmentData)) throw new AppError(ERRORS.ASSIGNMENT_ALREADY_EXISTS, 409, "ASSIGNMENT_ALREADY_EXISTS");
    return repository.create(assignmentData);
};

const getAll = async (query, user) => {
    const filters = {};
    ["staffId", "classId", "subjectId", "sessionId", "termId"].forEach((key) => {
        if (query[key]) filters[key] = query[key];
    });
    if (user?.role === "TEACHER") {
        const staff = await repository.findStaffByUserId(user.userId);
        if (!staff) return [];
        filters.staffId = staff.id;
    }
    return repository.findAll(filters);
};

const getById = async (id, user) => {
    const assignment = await repository.findById(id);
    if (!assignment) throw new AppError(ERRORS.ASSIGNMENT_NOT_FOUND, 404, "ASSIGNMENT_NOT_FOUND");
    if (user?.role === "TEACHER") {
        const staff = await repository.findStaffByUserId(user.userId);
        if (!staff || assignment.staffId !== staff.id) throw new AppError("You can only view your own assignments.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
    } else if (!await hasPermission(user, "teacher_assignments:view")) {
        throw new AppError("You cannot view teacher assignments.", 403, "TEACHER_ASSIGNMENT_ACCESS_DENIED");
    }
    return assignment;
};

const remove = async (id) => { await getById(id, { role: "SUPER_ADMIN" }); return repository.remove(id); };
const getClassTeachers = async (query, user) => {
    const filters = {
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.sessionId ? { sessionId: query.sessionId } : {})
    };
    if (user?.role === "TEACHER") {
        const staff = await repository.findStaffByUserId(user.userId);
        if (!staff) return [];
        filters.staffId = staff.id;
    } else if (!await hasPermission(user, "teacher_assignments:view")) {
        throw new AppError("You cannot view class teacher assignments.", 403, "TEACHER_ASSIGNMENT_ACCESS_DENIED");
    }
    return repository.findClassTeacherAssignments(filters);
};
const assignClassTeacher = async (data, user) => {
    const [staff, schoolClass, session] = await Promise.all([
        repository.findStaffById(data.staffId),
        repository.findClassById(data.classId),
        repository.findSession(data.sessionId)
    ]);
    if (!staff || staff.status !== "ACTIVE") throw new AppError(ERRORS.STAFF_NOT_ACTIVE, 409, "STAFF_NOT_ACTIVE");
    if (!schoolClass || !schoolClass.isActive) throw new AppError(ERRORS.CLASS_NOT_FOUND, 404, "CLASS_NOT_FOUND");
    if (!session || !schoolClass.isActive) throw new AppError("Active class and academic session are required.", 404, "SESSION_OR_CLASS_NOT_FOUND");
    return repository.saveClassTeacherAssignment({ staffId: staff.id, classId: schoolClass.id, sessionId: session.id, assignedById: user.userId });
};
const removeClassTeacher = async (id) => {
    if (!(await repository.findClassTeacherAssignment(id))) throw new AppError("Class teacher assignment not found.", 404, "CLASS_TEACHER_ASSIGNMENT_NOT_FOUND");
    return repository.removeClassTeacherAssignment(id);
};
module.exports = { create, getAll, getById, remove, getClassTeachers, assignClassTeacher, removeClassTeacher };