// Term controller
const termService = require("./term.service");

const createTerm = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const term = await termService.createTerm(
            sessionId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Academic term created successfully.",
            data: term,
        });
    } catch (error) {
        next(error);
    }
};

const getAllTerms = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const terms = await termService.getAllTerms(sessionId);

        return res.status(200).json({
            success: true,
            message: "Academic terms retrieved successfully.",
            data: terms,
        });
    } catch (error) {
        next(error);
    }
};

const getTermById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const term = await termService.getTermById(id);

        return res.status(200).json({
            success: true,
            message: "Academic term retrieved successfully.",
            data: term,
        });
    } catch (error) {
        next(error);
    }
};

const updateTerm = async (req, res, next) => {
    try {
        const { id } = req.params;

        const term = await termService.updateTerm(
            id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Academic term updated successfully.",
            data: term,
        });
    } catch (error) {
        next(error);
    }
};

const activateTerm = async (req, res, next) => {
    try {
        const { id } = req.params;

        const term = await termService.activateTerm(id);

        return res.status(200).json({
            success: true,
            message: "Academic term activated successfully.",
            data: term,
        });
    } catch (error) {
        next(error);
    }
};

const closeTerm = async (req, res, next) => {
    try {
        const { id } = req.params;

        const term = await termService.closeTerm(id);

        return res.status(200).json({
            success: true,
            message: "Academic term closed successfully.",
            data: term,
        });
    } catch (error) {
        next(error);
    }
};

const deleteTerm = async (req, res, next) => {
    try {
        const { id } = req.params;

        await termService.deleteTerm(id);

        return res.status(200).json({
            success: true,
            message: "Academic term deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTerm,
    getAllTerms,
    getTermById,
    updateTerm,
    activateTerm,
    closeTerm,
    deleteTerm,
};