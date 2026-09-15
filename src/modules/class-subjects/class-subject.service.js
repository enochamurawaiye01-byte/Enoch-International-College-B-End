const AppError = require("../../core/errors/AppError");
const repository = require("./class-subject.repository");
const { CLASS_SUBJECT_ERRORS } = require("./class-subject.constants");

const ensureReferences = async (classId, subjectId) => {
    const [schoolClass, subject] = await Promise.all([
        repository.findClassById(classId),
        repository.findSubjectById(subjectId),
    ]);

    if (!schoolClass) throw new AppError(CLASS_SUBJECT_ERRORS.CLASS_NOT_FOUND, 404, "CLASS_NOT_FOUND");
    if (!subject) throw new AppError(CLASS_SUBJECT_ERRORS.SUBJECT_NOT_FOUND, 404, "SUBJECT_NOT_FOUND");
    if (!schoolClass.isActive) throw new AppError("The class is inactive.", 409, "CLASS_INACTIVE");
    if (!subject.isActive) throw new AppError("The subject is inactive.", 409, "SUBJECT_INACTIVE");
};

const create = async ({ classId, subjectId }) => {
    await ensureReferences(classId, subjectId);
    if (await repository.findByClassAndSubject(classId, subjectId)) {
        throw new AppError(CLASS_SUBJECT_ERRORS.CLASS_SUBJECT_ALREADY_EXISTS, 409, "CLASS_SUBJECT_ALREADY_EXISTS");
    }
    return repository.create({ classId, subjectId });
};

const getAll = (classId) => repository.findAll(classId);

const getById = async (id) => {
    const assignment = await repository.findById(id);
    if (!assignment) throw new AppError(CLASS_SUBJECT_ERRORS.CLASS_SUBJECT_NOT_FOUND, 404, "CLASS_SUBJECT_NOT_FOUND");
    return assignment;
};

const remove = async (id) => {
    await getById(id);
    return repository.remove(id);
};

module.exports = { create, getAll, getById, remove };