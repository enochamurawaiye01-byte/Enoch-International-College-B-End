// Subject service
const AppError = require("../../core/errors/AppError");
const { randomUUID } = require("crypto");

const subjectRepository = require("./subject.repository");
const { SUBJECT_ERRORS } = require("./subject.constants");

// Create subject
const createSubject = async (data) => {
    const name = data.name.trim();
    const code = data.code?.trim().toUpperCase() || `AUTO-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const classLevels = await subjectRepository.findClassLevelsByGroup(data.classGroup);
    if (!classLevels.length) throw new AppError(`No ${data.classGroup} class levels are configured.`, 409, "SUBJECT_CLASS_LEVELS_NOT_CONFIGURED");
    const departmentIds = data.classGroup === "SSS" ? [...new Set(data.departmentIds)] : [];
    if (departmentIds.length) {
        const departments = await subjectRepository.findDepartments(departmentIds);
        if (departments.length !== departmentIds.length) throw new AppError("One or more selected departments were not found.", 404, "DEPARTMENT_NOT_FOUND");
    }

    // Check duplicate subject name
    const existingName =
        await subjectRepository.findSubjectByName(name);

    if (existingName) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_ALREADY_EXISTS,
            409,
            "SUBJECT_ALREADY_EXISTS"
        );
    }

    // Check duplicate subject code
    const existingCode = code ? await subjectRepository.findSubjectByCode(code) : null;

    if (existingCode) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_CODE_ALREADY_EXISTS,
            409,
            "SUBJECT_CODE_ALREADY_EXISTS"
        );
    }

    if (data.departmentId && !(await subjectRepository.findDepartment(data.departmentId))) throw new AppError("Department not found.", 404, "DEPARTMENT_NOT_FOUND");
    const targets = classLevels.flatMap(({ id: classLevelId }) => departmentIds.length
        ? departmentIds.map((departmentId) => ({ classLevelId, departmentId }))
        : [{ classLevelId, departmentId: null }]);
    return subjectRepository.createSubjectWithTargets({
        name,
        code,
        description: data.description || null,
        departmentId: null,
        isActive: data.isActive ?? true,
    }, targets);
};

// Get all subjects
const getAllSubjects = async (user) => {
    let subjects;
    if (user?.role === "TEACHER") {
        const subjectIds = await subjectRepository.findTeacherSubjectIds(user.userId);
        subjects = await subjectRepository.findAllSubjects({ id: { in: subjectIds }, isActive: true });
    } else {
        subjects = await subjectRepository.findAllSubjects();
    }
    return subjects.map(formatSubject);
};

const formatSubject = (subject) => {
    const levels = subject.targets || [];
    const classGroup = levels.length
        ? levels.some(({ classLevel }) => classLevel.code.startsWith("SS")) ? "SSS" : "JSS"
        : subject.departmentId ? "SSS" : "JSS";
    return {
        ...subject,
        classGroup,
        departmentIds: [...new Set(levels.map(({ departmentId }) => departmentId).filter(Boolean))].length
            ? [...new Set(levels.map(({ departmentId }) => departmentId).filter(Boolean))]
            : subject.departmentId ? [subject.departmentId] : [],
        targetSummary: levels.length
            ? [...new Set(levels.map(({ classLevel, department }) =>
                department ? `${classLevel.name} — ${department.name}` : classLevel.name
            ))].join(", ")
            : subject.department?.name || "All class groups",
    };
};

// Get subject by ID
const getSubjectById = async (id, user) => {
    const subject =
        await subjectRepository.findSubjectById(id);

    if (!subject) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_NOT_FOUND,
            404,
            "SUBJECT_NOT_FOUND"
        );
    }

    if (user?.role === "TEACHER" && !(await subjectRepository.findTeacherSubjectIds(user.userId)).includes(subject.id)) {
        throw new AppError("You are not assigned to this subject.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
    }

    return formatSubject(subject);
};

// Update subject
const updateSubject = async (id, data) => {
    const existingSubject =
        await subjectRepository.findSubjectById(id);

    if (!existingSubject) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_NOT_FOUND,
            404,
            "SUBJECT_NOT_FOUND"
        );
    }

    if (data.classGroup !== undefined || data.departmentIds !== undefined) {
        throw new AppError("Subject class and department availability cannot be changed after creation. Create a new subject with the correct options to protect existing enrollments and results.", 409, "SUBJECT_TARGETS_IMMUTABLE");
    }

    const updateData = {};

    // Update name
    if (data.name !== undefined) {
        const name = data.name.trim();

        if (name !== existingSubject.name) {
            const duplicateName =
                await subjectRepository.findSubjectByName(name);

            if (
                duplicateName &&
                duplicateName.id !== id
            ) {
                throw new AppError(
                    SUBJECT_ERRORS.SUBJECT_ALREADY_EXISTS,
                    409,
                    "SUBJECT_ALREADY_EXISTS"
                );
            }
        }

        updateData.name = name;
    }

    // Update code
    if (data.code !== undefined) {
        const code = data.code?.trim().toUpperCase() || `AUTO-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

        if (code && code !== existingSubject.code) {
            const duplicateCode = await subjectRepository.findSubjectByCode(code);

            if (
                duplicateCode &&
                duplicateCode.id !== id
            ) {
                throw new AppError(
                    SUBJECT_ERRORS.SUBJECT_CODE_ALREADY_EXISTS,
                    409,
                    "SUBJECT_CODE_ALREADY_EXISTS"
                );
            }
        }

        updateData.code = code;
    }

    // Update description
    if (data.description !== undefined) {
        updateData.description =
            data.description || null;
    }

    if (data.departmentId !== undefined) {
        if (data.departmentId && !(await subjectRepository.findDepartment(data.departmentId))) throw new AppError("Department not found.", 404, "DEPARTMENT_NOT_FOUND");
        updateData.departmentId = data.departmentId || null;
    }

    // Update active status
    if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
    }

    return subjectRepository.updateSubject(
        id,
        updateData
    );
};

// Delete subject
const deleteSubject = async (id) => {
    const result = await subjectRepository.deleteSubjectSafely(id);
    if (!result.found) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_NOT_FOUND,
            404,
            "SUBJECT_NOT_FOUND"
        );
    }
    if (result.inUse) throw new AppError(
        "This subject is linked to class registrations or academic records. Archive it instead to preserve history.",
        409,
        "SUBJECT_IN_USE"
    );
    return { deleted: true };
};

const archiveSubject = async (id) => {
    const existingSubject = await subjectRepository.findSubjectById(id);
    if (!existingSubject) throw new AppError(SUBJECT_ERRORS.SUBJECT_NOT_FOUND, 404, "SUBJECT_NOT_FOUND");
    if (!existingSubject.isActive) return existingSubject;
    return subjectRepository.deactivateSubject(id);
};

module.exports = {
    createSubject,
    getAllSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
    archiveSubject,
};