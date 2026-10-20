const AppError = require("../../core/errors/AppError");
const repository = require("./teacher-assignment.repository");
const { hasPermission } = require("../../core/middleware/authorization.middleware");
const { getFileUrl } = require("../../config/storage");
const { TEACHER_ASSIGNMENT_ERRORS: ERRORS } = require("./teacher-assignment.constants");
const { isTeachingAccount } = require("../../core/utils/teaching-roles");

const hasTeachingRole = (user) => isTeachingAccount(user)
    || user?.roleAssignments?.some((assignment) =>
        assignment.status === "ACTIVE"
        && isTeachingAccount({ role: assignment.role?.name })
        && assignment.role.isActive !== false
    );

const create = async (data) => {
    const [staff, subject] = await Promise.all([
        repository.findStaffById(data.staffId),
        repository.findSubjectById(data.subjectId),
    ]);
    if (!staff) throw new AppError(ERRORS.STAFF_NOT_FOUND, 404, "STAFF_NOT_FOUND");
    if (staff.status !== "ACTIVE") throw new AppError(ERRORS.STAFF_NOT_ACTIVE, 409, "STAFF_NOT_ACTIVE");
    if (!subject) throw new AppError(ERRORS.SUBJECT_NOT_FOUND, 404, "SUBJECT_NOT_FOUND");
    const session = data.sessionId ? await repository.findSession(data.sessionId) : null;
    const term = data.termId ? await repository.findTerm(data.termId) : null;
    if (data.sessionId && !session) throw new AppError("Academic session not found.", 404, "SESSION_NOT_FOUND");
    if (data.termId && !term) throw new AppError("Term not found.", 404, "TERM_NOT_FOUND");
    if (term && session && term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");

    const assignmentData = { ...data, sessionId: data.sessionId || null, termId: data.termId || null };
    if (data.classLevel) {
        const classesWithSubject = await repository.findClassesWithSubject(data.subjectId, data.classLevel);
        if (!classesWithSubject.length) throw new AppError(ERRORS.SUBJECT_NOT_ASSIGNED_TO_CLASS, 409, "SUBJECT_NOT_ASSIGNED_TO_CLASS");
        return repository.createForClasses(classesWithSubject.map(({ class: schoolClass }) => ({
            staffId: data.staffId,
            subjectId: data.subjectId,
            classId: schoolClass.id,
            sessionId: assignmentData.sessionId,
            termId: assignmentData.termId
        })));
    }
    const [schoolClass, classSubject] = await Promise.all([
        repository.findClassById(data.classId),
        repository.findClassSubject(data.classId, data.subjectId)
    ]);
    if (!schoolClass) throw new AppError(ERRORS.CLASS_NOT_FOUND, 404, "CLASS_NOT_FOUND");
    if (!classSubject) throw new AppError(ERRORS.SUBJECT_NOT_ASSIGNED_TO_CLASS, 409, "SUBJECT_NOT_ASSIGNED_TO_CLASS");
    if (await repository.findDuplicate(assignmentData)) throw new AppError(ERRORS.ASSIGNMENT_ALREADY_EXISTS, 409, "ASSIGNMENT_ALREADY_EXISTS");
    return repository.create(assignmentData);
};

const getAll = async (query, user) => {
    const filters = {};
    ["staffId", "classId", "subjectId", "sessionId", "termId"].forEach((key) => {
        if (query[key]) filters[key] = query[key];
    });
    if (isTeachingAccount(user)) {
        const staff = await repository.findStaffByUserId(user.userId);
        if (!staff) return [];
        filters.staffId = staff.id;
    }
    const assignments = await repository.findAll(filters);
    return Promise.all(assignments.map(async (assignment) => ({
        ...assignment,
        staff: assignment.staff ? { ...assignment.staff, profileImageUrl: await getFileUrl(assignment.staff.profileImageUrl) } : assignment.staff,
    })));
};

const getById = async (id, user) => {
    const assignment = await repository.findById(id);
    if (!assignment) throw new AppError(ERRORS.ASSIGNMENT_NOT_FOUND, 404, "ASSIGNMENT_NOT_FOUND");
    if (isTeachingAccount(user)) {
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
    if (isTeachingAccount(user)) {
        const staff = await repository.findStaffByUserId(user.userId);
        if (!staff) return [];
        filters.staffId = staff.id;
    } else if (!await hasPermission(user, "teacher_assignments:view")) {
        throw new AppError("You cannot view class teacher assignments.", 403, "TEACHER_ASSIGNMENT_ACCESS_DENIED");
    }
    const assignments = await repository.findClassTeacherAssignments(filters);
    return Promise.all(assignments.map(async (assignment) => ({
        ...assignment,
        staff: assignment.staff ? { ...assignment.staff, profileImageUrl: await getFileUrl(assignment.staff.profileImageUrl) } : assignment.staff,
    })));
};
const assignClassTeacher = async (data, user) => {
    const [staff, schoolClass, session] = await Promise.all([
        repository.findStaffById(data.staffId),
        repository.findClassById(data.classId),
        repository.findSession(data.sessionId)
    ]);
    if (!staff || staff.status !== "ACTIVE" || staff.user.status !== "ACTIVE") throw new AppError(ERRORS.STAFF_NOT_ACTIVE, 409, "STAFF_NOT_ACTIVE");
    if (!hasTeachingRole(staff.user)) throw new AppError("Only active teachers can be assigned as class teachers.", 403, "TEACHER_ROLE_REQUIRED");
    if (!schoolClass || !schoolClass.isActive) throw new AppError(ERRORS.CLASS_NOT_FOUND, 404, "CLASS_NOT_FOUND");
    if (!session) throw new AppError("An academic session is required.", 404, "SESSION_NOT_FOUND");
    const classTeacherRole = await repository.findClassTeacherRole();
    if (!classTeacherRole?.isActive) {
        throw new AppError("The CLASS_TEACHER role is missing or inactive. Activate it in role management first.", 409, "CLASS_TEACHER_ROLE_NOT_CONFIGURED");
    }
    const existingAssignment = await repository.findClassTeacherAssignmentByClassSession(schoolClass.id, session.id);
    if (existingAssignment) {
        if (existingAssignment.staffId !== staff.id) {
            throw new AppError("This class already has a class teacher for the selected academic session. Remove the existing assignment before assigning another teacher.", 409, "CLASS_TEACHER_ALREADY_ASSIGNED");
        }
        await repository.ensureClassTeacherRole(staff.user.id, user.userId, staff.user.role);
        return existingAssignment;
    }
    try {
        return await repository.saveClassTeacherAssignment({ staffId: staff.id, classId: schoolClass.id, sessionId: session.id, assignedById: user.userId });
    } catch (error) {
        if (error.code === "P2002") {
            throw new AppError("This class already has a class teacher for the selected academic session. Refresh the assignments and try again.", 409, "CLASS_TEACHER_ALREADY_ASSIGNED");
        }
        if (error.code === "CLASS_TEACHER_ROLE_NOT_CONFIGURED") {
            throw new AppError(error.message, 409, error.code);
        }
        throw error;
    }
};
const removeClassTeacher = async (id) => {
    if (!(await repository.findClassTeacherAssignment(id))) throw new AppError("Class teacher assignment not found.", 404, "CLASS_TEACHER_ASSIGNMENT_NOT_FOUND");
    const removed = await repository.removeClassTeacherAssignment(id);
    if (!removed) throw new AppError("Class teacher assignment could not be removed.", 409, "CLASS_TEACHER_ASSIGNMENT_REMOVE_FAILED");
    return removed;
};
module.exports = { create, getAll, getById, remove, getClassTeachers, assignClassTeacher, removeClassTeacher };