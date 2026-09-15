const AppError = require("../../core/errors/AppError");
const repository = require("./teacher-assignment.repository");
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

    const assignmentData = { ...data, sessionId: data.sessionId || null, termId: data.termId || null };
    if (await repository.findDuplicate(assignmentData)) throw new AppError(ERRORS.ASSIGNMENT_ALREADY_EXISTS, 409, "ASSIGNMENT_ALREADY_EXISTS");
    return repository.create(assignmentData);
};

const getAll = (query) => {
    const filters = {};
    ["staffId", "classId", "subjectId", "sessionId", "termId"].forEach((key) => {
        if (query[key]) filters[key] = query[key];
    });
    return repository.findAll(filters);
};

const getById = async (id) => {
    const assignment = await repository.findById(id);
    if (!assignment) throw new AppError(ERRORS.ASSIGNMENT_NOT_FOUND, 404, "ASSIGNMENT_NOT_FOUND");
    return assignment;
};

const remove = async (id) => { await getById(id); return repository.remove(id); };
module.exports = { create, getAll, getById, remove };