// AcademicSession constants
const SESSION_ERRORS = {
    SESSION_ALREADY_EXISTS:
        "Academic session already exists.",

    SESSION_NOT_FOUND:
        "Academic session not found.",

    SESSION_ALREADY_ACTIVE:
        "This academic session is already active.",

    ANOTHER_SESSION_ACTIVE:
        "Another academic session is currently active.",

    INVALID_SESSION_NAME:
        "Session name must follow the format YYYY/YYYY.",

    INVALID_SESSION_YEAR:
        "The ending year must be exactly one year after the starting year.",

    SESSION_HAS_TERMS:
        "Cannot delete a session that contains academic terms.",

    SESSION_IN_USE:
        "This academic session is already linked to students or records.",

    SESSION_ALREADY_CLOSED:
        "This academic session has already been closed.",

    SESSION_NOT_ACTIVE:
        "Only an active session can be closed.",

    START_DATE_REQUIRED:
        "Session start date is required.",

    END_DATE_REQUIRED:
        "Session end date is required.",

    INVALID_DATE_RANGE:
        "End date must be after the start date.",
};

const SESSION_STATUS = {
    ACTIVE: "ACTIVE",
    UPCOMING: "UPCOMING",
    CLOSED: "CLOSED",
};

module.exports = {
    SESSION_ERRORS,
    SESSION_STATUS,
};