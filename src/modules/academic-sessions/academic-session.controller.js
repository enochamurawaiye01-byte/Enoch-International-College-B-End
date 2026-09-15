const service = require("./academic-session.service");

const createSession = async (req, res, next) => {
    try {
        const session = await service.createSession(
            req.user.schoolId,
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Academic session created successfully",
            data: { session },
        });
    } catch (error) {
        next(error);
    }
};

const getAllSessions = async (req, res, next) => {
    try {
        const sessions = await service.getAllSessions(
            req.user.schoolId
        );

        res.status(200).json({
            success: true,
            data: { sessions },
        });
    } catch (error) {
        next(error);
    }
};

const getSessionById = async (req, res, next) => {
    try {
        const session = await service.getSessionById(
            req.params.id,
            req.user.schoolId
        );

        res.status(200).json({
            success: true,
            data: { session },
        });
    } catch (error) {
        next(error);
    }
};

const updateSession = async (req, res, next) => {
    try {
        const session = await service.updateSession(
            req.params.id,
            req.user.schoolId,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Academic session updated successfully",
            data: { session },
        });
    } catch (error) {
        next(error);
    }
};

const activateSession = async (req, res, next) => {
    try {
        const session = await service.activateSession(
            req.params.id,
            req.user.schoolId
        );

        res.status(200).json({
            success: true,
            message: "Academic session activated successfully",
            data: { session },
        });
    } catch (error) {
        next(error);
    }
};

const deleteSession = async (req, res, next) => {
    try {
        await service.deleteSession(req.params.id, req.user.schoolId);

        res.status(200).json({
            success: true,
            message: "Academic session deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSession,
    getAllSessions,
    getSessionById,
    updateSession,
    activateSession,
    deleteSession,
};