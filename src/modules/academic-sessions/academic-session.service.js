const repository = require("./academic-session.repository");
const { SESSION_ERRORS } = require("./academic-session.constants");
const AppError = require("../../core/errors/AppError");

const createSession = async (schoolId, data) => {
    if (!schoolId) {
        throw new AppError("User is not assigned to a school.", 400);
    }

    const existingSession = await repository.findByName(
        schoolId,
        data.name
    );

    if (existingSession) {
        throw new AppError(
            SESSION_ERRORS.SESSION_ALREADY_EXISTS,
            409
        );
    }

    if (data.isActive) {
        await repository.deactivateAllSessions(schoolId);
    }

    return repository.create({
        ...data,
        schoolId,
    });
};

const getAllSessions = async (schoolId) => {
    return repository.findAll(schoolId);
};

const getSessionById = async (id, schoolId) => {
    const session = await repository.findById(id, schoolId);

    if (!session) {
        throw new AppError(
            SESSION_ERRORS.SESSION_NOT_FOUND,
            404
        );
    }

    return session;
};

const updateSession = async (id, schoolId, data) => {
    const session = await repository.findById(id, schoolId);

    if (!session) {
        throw new AppError(
            SESSION_ERRORS.SESSION_NOT_FOUND,
            404
        );
    }

    if (data.name && data.name !== session.name) {
        const existingSession = await repository.findByName(
            session.schoolId,
            data.name
        );

        if (existingSession) {
            throw new AppError(
                SESSION_ERRORS.SESSION_ALREADY_EXISTS,
                409
            );
        }
    }

    if (data.isActive === true) {
        await repository.deactivateAllSessions(schoolId);
    }

    return repository.update(id, data);
};

const activateSession = async (id, schoolId) => {
    const session = await repository.findById(id, schoolId);

    if (!session) {
        throw new AppError(
            SESSION_ERRORS.SESSION_NOT_FOUND,
            404
        );
    }

    if (session.isActive) {
        throw new AppError(
            SESSION_ERRORS.SESSION_ALREADY_ACTIVE,
            400
        );
    }

    await repository.deactivateAllSessions(schoolId);

    return repository.update(id, {
        isActive: true,
    });
};

const deleteSession = async (id, schoolId) => {
    const session = await repository.findById(id, schoolId);

    if (!session) {
        throw new AppError(
            SESSION_ERRORS.SESSION_NOT_FOUND,
            404
        );
    }

    if (session.isActive) {
        throw new AppError(
            "You cannot delete an active academic session.",
            400
        );
    }

    return repository.remove(id);
};

const getCurrentSession = async (schoolId) => {
    let session = await repository.findActiveSession();
    if (!session && schoolId) {
        const all = await repository.findAll(schoolId);
        session = all[0] || null;
    }
    if (!session) {
        throw new AppError("No active academic session found.", 404, "ACTIVE_SESSION_NOT_FOUND");
    }
    return session;
};

module.exports = {
    createSession,
    getAllSessions,
    getSessionById,
    getCurrentSession,
    updateSession,
    activateSession,
    deleteSession,
};