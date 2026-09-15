// Term constants
const TERM_ERRORS = {
    TERM_ALREADY_EXISTS: "This term already exists for the academic session.",
    TERM_NOT_FOUND: "Academic term not found.",
    TERM_ALREADY_ACTIVE: "This term is already active.",
    ANOTHER_TERM_ACTIVE: "Another term is currently active.",
    TERM_DATE_OVERLAP:
        "The term dates overlap with another term in this academic session.",
    INVALID_TERM_TYPE: "Invalid term type.",
    START_DATE_REQUIRED: "Term start date is required.",
    END_DATE_REQUIRED: "Term end date is required.",
    INVALID_DATE_RANGE: "Term end date must be after the start date.",
    TERM_OUTSIDE_SESSION:
        "Term dates must fall within the academic session.",
    SESSION_NOT_FOUND: "Academic session not found.",
    SESSION_NOT_ACTIVE:
        "The academic session must be active before activating a term.",
    TERM_IN_USE:
        "This term is already linked to school records.",
};
const TERM_TYPES = {
  FIRST: "FIRST",
  SECOND: "SECOND",
  THIRD: "THIRD",
};

module.exports = {
  TERM_ERRORS,
  TERM_TYPES,
};
