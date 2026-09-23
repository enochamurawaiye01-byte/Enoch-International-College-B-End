const classService = require("./class.service");

// Create class
const createClass = async (req, res, next) => {
    try {
        const schoolClass = await classService.createClass(
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Class created successfully.",
            data: schoolClass,
        });
    } catch (error) {
        next(error);
    }
};

// Get all classes
const getAllClasses = async (req, res, next) => {
    try {
        const classes = await classService.getAllClasses();

        return res.status(200).json({
            success: true,
            data: classes,
        });
    } catch (error) {
        next(error);
    }
};

// Get class by ID
const getClassById = async (req, res, next) => {
    try {
        const schoolClass = await classService.getClassById(
            req.params.id
        );

        return res.status(200).json({
            success: true,
            data: schoolClass,
        });
    } catch (error) {
        next(error);
    }
};

// Update class
const updateClass = async (req, res, next) => {
    try {
        const schoolClass = await classService.updateClass(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Class updated successfully.",
            data: schoolClass,
        });
    } catch (error) {
        next(error);
    }
};

const getStudents = async (req, res, next) => { try { return res.json({ success: true, data: await classService.getStudents(req.params.id, req.user) }); } catch (error) { next(error); } };

// Delete class
const deleteClass = async (req, res, next) => {
    try {
        await classService.deleteClass(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Class deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createClass,
    getAllClasses,
    getClassById,
    updateClass,
    deleteClass,
    getStudents,
};