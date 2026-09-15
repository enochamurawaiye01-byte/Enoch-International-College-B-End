const AppError = require("../../core/errors/AppError");

const classRepository = require("./class.repository");
const { CLASS_ERRORS } = require("./class.constants");

// Create a class/arm
const createClass = async (data) => {
    const levelName = data.level.trim();
    const arm = data.arm.trim().toUpperCase();

    // Find the class level
    const classLevel =
        await classRepository.findClassLevelByName(levelName);

    if (!classLevel) {
        throw new AppError(
            CLASS_ERRORS.CLASS_LEVEL_NOT_FOUND,
            404,
            "CLASS_LEVEL_NOT_FOUND"
        );
    }

    // Check if this arm already exists under this level
    const existingClass =
        await classRepository.findClassByLevelAndArm(
            classLevel.id,
            arm
        );

    if (existingClass) {
        throw new AppError(
            CLASS_ERRORS.CLASS_ALREADY_EXISTS,
            409,
            "CLASS_ALREADY_EXISTS"
        );
    }

    // Generate class name automatically
    const name = `${classLevel.name} ${arm}`;

    return classRepository.createClass({
        classLevelId: classLevel.id,
        name,
        arm,
        description: data.description || null,
        isActive: data.isActive ?? true,
    });
};

// Get all classes
const getAllClasses = async () => {
    return classRepository.findAllClasses();
};

// Get one class
const getClassById = async (id) => {
    const schoolClass =
        await classRepository.findClassById(id);

    if (!schoolClass) {
        throw new AppError(
            CLASS_ERRORS.CLASS_NOT_FOUND,
            404,
            "CLASS_NOT_FOUND"
        );
    }

    return schoolClass;
};

// Update class
const updateClass = async (id, data) => {
    const existingClass =
        await classRepository.findClassById(id);

    if (!existingClass) {
        throw new AppError(
            CLASS_ERRORS.CLASS_NOT_FOUND,
            404,
            "CLASS_NOT_FOUND"
        );
    }

    let classLevelId = existingClass.classLevelId;
    let classLevel = existingClass.classLevel;

    // If level is being changed
    if (data.level) {
        const levelName = data.level.trim();

        classLevel =
            await classRepository.findClassLevelByName(
                levelName
            );

        if (!classLevel) {
            throw new AppError(
                CLASS_ERRORS.CLASS_LEVEL_NOT_FOUND,
                404,
                "CLASS_LEVEL_NOT_FOUND"
            );
        }

        classLevelId = classLevel.id;
    }

    const arm = data.arm
        ? data.arm.trim().toUpperCase()
        : existingClass.arm;

    // Check duplicate only if level/arm changed
    if (
        classLevelId !== existingClass.classLevelId ||
        arm !== existingClass.arm
    ) {
        const duplicate =
            await classRepository.findClassByLevelAndArm(
                classLevelId,
                arm
            );

        if (duplicate && duplicate.id !== id) {
            throw new AppError(
                CLASS_ERRORS.CLASS_ALREADY_EXISTS,
                409,
                "CLASS_ALREADY_EXISTS"
            );
        }
    }

    // Generate the new class name
    const name = `${classLevel.name} ${arm}`;

    const updateData = {
        classLevelId,
        name,
        arm,
    };

    if (data.description !== undefined) {
        updateData.description =
            data.description || null;
    }

    if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
    }

    return classRepository.updateClass(
        id,
        updateData
    );
};

// Delete class
const deleteClass = async (id) => {
    const existingClass =
        await classRepository.findClassById(id);

    if (!existingClass) {
        throw new AppError(
            CLASS_ERRORS.CLASS_NOT_FOUND,
            404,
            "CLASS_NOT_FOUND"
        );
    }

    const usage =
        await classRepository.findClassUsage(id);

    const counts = usage?._count;

    const isInUse =
        counts &&
        Object.values(counts).some(
            (count) => count > 0
        );

    if (isInUse) {
        throw new AppError(
            CLASS_ERRORS.CLASS_ALREADY_IN_USE,
            409,
            "CLASS_ALREADY_IN_USE"
        );
    }

    return classRepository.deleteClass(id);
};

module.exports = {
    createClass,
    getAllClasses,
    getClassById,
    updateClass,
    deleteClass,
};