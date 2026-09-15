// Subject controller
const subjectService = require("./subject.service");

// Create subject
const createSubject = async (req, res, next) => {
    try {
        const subject = await subjectService.createSubject(
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Subject created successfully.",
            data: subject,
        });
    } catch (error) {
        next(error);
    }
};

// Get all subjects
const getAllSubjects = async (req, res, next) => {
    try {
        const subjects =
            await subjectService.getAllSubjects();

        return res.status(200).json({
            success: true,
            data: subjects,
        });
    } catch (error) {
        next(error);
    }
};

// Get subject by ID
const getSubjectById = async (req, res, next) => {
    try {
        const subject =
            await subjectService.getSubjectById(
                req.params.id
            );

        return res.status(200).json({
            success: true,
            data: subject,
        });
    } catch (error) {
        next(error);
    }
};

// Update subject
const updateSubject = async (req, res, next) => {
    try {
        const subject =
            await subjectService.updateSubject(
                req.params.id,
                req.body
            );

        return res.status(200).json({
            success: true,
            message: "Subject updated successfully.",
            data: subject,
        });
    } catch (error) {
        next(error);
    }
};

// Delete subject
const deleteSubject = async (req, res, next) => {
    try {
        await subjectService.deleteSubject(
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Subject deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSubject,
    getAllSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
};