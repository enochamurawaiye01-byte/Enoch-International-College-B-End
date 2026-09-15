const AppError = require("../../core/errors/AppError");
const termRepository = require("./term.repository");
const { TERM_ERRORS } = require("./term.constants");

// ========================================
// CREATE TERM
// ========================================

const createTerm = async (sessionId, data) => {
    // Check if academic session exists
    const session = await termRepository.findSessionById(sessionId);

    if (!session) {
        throw new AppError(
            TERM_ERRORS.SESSION_NOT_FOUND,
            404,
            "SESSION_NOT_FOUND"
        );
    }

    // Check that term dates are inside academic session
    if (
        data.startDate < session.startDate ||
        data.endDate > session.endDate
    ) {
        throw new AppError(
            TERM_ERRORS.TERM_OUTSIDE_SESSION,
            400,
            "TERM_OUTSIDE_SESSION"
        );
    }

    // Check duplicate term type
    const existingTerm =
        await termRepository.findTermBySessionAndType(
            sessionId,
            data.type
        );

    if (existingTerm) {
        throw new AppError(
            TERM_ERRORS.TERM_ALREADY_EXISTS,
            409,
            "TERM_ALREADY_EXISTS"
        );
    }

    // Check date overlap
    const overlappingTerm =
        await termRepository.findOverlappingTerm(
            sessionId,
            data.startDate,
            data.endDate
        );

    if (overlappingTerm) {
        throw new AppError(
            TERM_ERRORS.TERM_DATE_OVERLAP,
            409,
            "TERM_DATE_OVERLAP"
        );
    }

    // Check currently active term
    const activeTerm =
        await termRepository.findActiveTermBySession(sessionId);

    if (activeTerm) {
        const now = new Date();

        if (now < activeTerm.endDate) {
            throw new AppError(
                "The current term has not ended yet. You cannot create another term.",
                409,
                "CURRENT_TERM_NOT_ENDED"
            );
        }
    }

    // Prevent multiple active terms
    if (data.isActive && activeTerm) {
        throw new AppError(
            TERM_ERRORS.ANOTHER_TERM_ACTIVE,
            409,
            "ANOTHER_TERM_ACTIVE"
        );
    }

    return termRepository.createTerm({
        ...data,
        sessionId,
    });
};

// ========================================
// GET ALL TERMS
// ========================================

const getAllTerms = async (sessionId) => {
    return termRepository.findAllTerms(sessionId);
};

// ========================================
// GET TERM BY ID
// ========================================

const getTermById = async (id) => {
    const term = await termRepository.findTermById(id);

    if (!term) {
        throw new AppError(
            TERM_ERRORS.TERM_NOT_FOUND,
            404,
            "TERM_NOT_FOUND"
        );
    }

    return term;
};

// ========================================
// UPDATE TERM
// ========================================

const updateTerm = async (id, data) => {
    const existingTerm =
        await termRepository.findTermById(id);

    if (!existingTerm) {
        throw new AppError(
            TERM_ERRORS.TERM_NOT_FOUND,
            404,
            "TERM_NOT_FOUND"
        );
    }

    // Check duplicate term type
    if (data.type && data.type !== existingTerm.type) {
        const duplicateTerm =
            await termRepository.findTermBySessionAndType(
                existingTerm.sessionId,
                data.type
            );

        if (duplicateTerm) {
            throw new AppError(
                TERM_ERRORS.TERM_ALREADY_EXISTS,
                409,
                "TERM_ALREADY_EXISTS"
            );
        }
    }

    const startDate =
        data.startDate || existingTerm.startDate;

    const endDate =
        data.endDate || existingTerm.endDate;

    // Check date range
    if (endDate <= startDate) {
        throw new AppError(
            TERM_ERRORS.INVALID_DATE_RANGE,
            400,
            "INVALID_DATE_RANGE"
        );
    }

    // Get academic session
    const session = await termRepository.findSessionById(
        existingTerm.sessionId
    );

    if (!session) {
        throw new AppError(
            TERM_ERRORS.SESSION_NOT_FOUND,
            404,
            "SESSION_NOT_FOUND"
        );
    }

    // Check dates against academic session
    if (
        startDate < session.startDate ||
        endDate > session.endDate
    ) {
        throw new AppError(
            TERM_ERRORS.TERM_OUTSIDE_SESSION,
            400,
            "TERM_OUTSIDE_SESSION"
        );
    }

    // Check overlapping terms
    const overlappingTerm =
        await termRepository.findOverlappingTerm(
            existingTerm.sessionId,
            startDate,
            endDate,
            id
        );

    if (overlappingTerm) {
        throw new AppError(
            TERM_ERRORS.TERM_DATE_OVERLAP,
            409,
            "TERM_DATE_OVERLAP"
        );
    }

    // Prevent multiple active terms
    if (data.isActive === true && !existingTerm.isActive) {
        const activeTerm =
            await termRepository.findActiveTermBySession(
                existingTerm.sessionId
            );

        if (activeTerm && activeTerm.id !== id) {
            throw new AppError(
                TERM_ERRORS.ANOTHER_TERM_ACTIVE,
                409,
                "ANOTHER_TERM_ACTIVE"
            );
        }
    }

    return termRepository.updateTerm(id, data);
};

// ========================================
// ACTIVATE TERM
// ========================================

const activateTerm = async (id) => {
    const term = await termRepository.findTermById(id);

    if (!term) {
        throw new AppError(
            TERM_ERRORS.TERM_NOT_FOUND,
            404,
            "TERM_NOT_FOUND"
        );
    }

    if (term.isActive) {
        throw new AppError(
            TERM_ERRORS.TERM_ALREADY_ACTIVE,
            409,
            "TERM_ALREADY_ACTIVE"
        );
    }

    const now = new Date();

    if (now < term.startDate) {
        throw new AppError(
            "This term cannot be activated before its start date.",
            400,
            "TERM_NOT_STARTED"
        );
    }

    if (now > term.endDate) {
        throw new AppError(
            "This term has already ended and cannot be activated.",
            400,
            "TERM_ALREADY_ENDED"
        );
    }

    const activeTerm =
        await termRepository.findActiveTermBySession(
            term.sessionId
        );

    if (activeTerm && activeTerm.id !== id) {
        throw new AppError(
            TERM_ERRORS.ANOTHER_TERM_ACTIVE,
            409,
            "ANOTHER_TERM_ACTIVE"
        );
    }

    return termRepository.updateTerm(id, {
        isActive: true,
    });
};

// ========================================
// DELETE TERM
// ========================================

const deleteTerm = async (id) => {
    const term = await termRepository.findTermById(id);

    if (!term) {
        throw new AppError(
            TERM_ERRORS.TERM_NOT_FOUND,
            404,
            "TERM_NOT_FOUND"
        );
    }

    if (term.isActive) {
        throw new AppError(
            "An active term cannot be deleted.",
            409,
            "ACTIVE_TERM_CANNOT_BE_DELETED"
        );
    }

    return termRepository.deleteTerm(id);
};
// ========================================
// CLOSE TERM
// ========================================

const closeTerm = async (id) => {
    const term = await termRepository.findTermById(id);

    if (!term) {
        throw new AppError(
            TERM_ERRORS.TERM_NOT_FOUND,
            404,
            "TERM_NOT_FOUND"
        );
    }

    if (!term.isActive) {
        throw new AppError(
            "This term is not currently active.",
            409,
            "TERM_NOT_ACTIVE"
        );
    }

    return termRepository.closeTerm(id);
};
// ========================================
// EXPORTS
// ========================================

module.exports = {
    createTerm,
    getAllTerms,
    getTermById,
    updateTerm,
    activateTerm,
    deleteTerm,
    closeTerm,
};