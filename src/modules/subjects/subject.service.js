// Subject service
const AppError = require("../../core/errors/AppError");

const subjectRepository = require("./subject.repository");
const { SUBJECT_ERRORS } = require("./subject.constants");

// Create subject
const createSubject = async (data) => {
    const name = data.name.trim();
    const code = data.code.trim().toUpperCase();

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
    const existingCode =
        await subjectRepository.findSubjectByCode(code);

    if (existingCode) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_CODE_ALREADY_EXISTS,
            409,
            "SUBJECT_CODE_ALREADY_EXISTS"
        );
    }

    return subjectRepository.createSubject({
        name,
        code,
        description: data.description || null,
        isActive: data.isActive ?? true,
    });
};

// Get all subjects
const getAllSubjects = async () => {
    return subjectRepository.findAllSubjects();
};

// Get subject by ID
const getSubjectById = async (id) => {
    const subject =
        await subjectRepository.findSubjectById(id);

    if (!subject) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_NOT_FOUND,
            404,
            "SUBJECT_NOT_FOUND"
        );
    }

    return subject;
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
        const code = data.code.trim().toUpperCase();

        if (code !== existingSubject.code) {
            const duplicateCode =
                await subjectRepository.findSubjectByCode(code);

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
    const existingSubject =
        await subjectRepository.findSubjectById(id);

    if (!existingSubject) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_NOT_FOUND,
            404,
            "SUBJECT_NOT_FOUND"
        );
    }

    const usage =
        await subjectRepository.findSubjectUsage(id);

    const counts = usage?._count;

    const isInUse =
        counts &&
        Object.values(counts).some(
            (count) => count > 0
        );

    if (isInUse) {
        throw new AppError(
            SUBJECT_ERRORS.SUBJECT_ALREADY_IN_USE,
            409,
            "SUBJECT_ALREADY_IN_USE"
        );
    }

    return subjectRepository.deleteSubject(id);
};

module.exports = {
    createSubject,
    getAllSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
};