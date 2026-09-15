// QuestionBank constants
/**
 * Question Bank Constants
 *
 * Business-level constants used by the Question Bank module.
 */

// Question difficulty levels
const QUESTION_DIFFICULTIES = Object.freeze({
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
});

// Question bank status
const QUESTION_STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
});

// Question types
const QUESTION_TYPES = Object.freeze({
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
  SHORT_ANSWER: "SHORT_ANSWER",
  ESSAY: "ESSAY",
});

// Default pagination
const QUESTION_BANK_PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

// Question limits
const QUESTION_LIMITS = Object.freeze({
  MIN_MARKS: 1,
  MAX_MARKS: 100,
  MAX_OPTIONS: 10,
  MIN_OPTIONS_FOR_MCQ: 2,
});

// Automatically gradable question types
const AUTO_GRADABLE_QUESTION_TYPES = Object.freeze([
  QUESTION_TYPES.MULTIPLE_CHOICE,
  QUESTION_TYPES.TRUE_FALSE,
]);

// Manually gradable question types
const MANUAL_GRADABLE_QUESTION_TYPES = Object.freeze([
  QUESTION_TYPES.SHORT_ANSWER,
  QUESTION_TYPES.ESSAY,
]);

// Question types that require options
const QUESTION_TYPES_REQUIRING_OPTIONS = Object.freeze([
  QUESTION_TYPES.MULTIPLE_CHOICE,
]);

// Question types that require a correct answer
const QUESTION_TYPES_REQUIRING_CORRECT_ANSWER = Object.freeze([
  QUESTION_TYPES.MULTIPLE_CHOICE,
  QUESTION_TYPES.TRUE_FALSE,
  QUESTION_TYPES.SHORT_ANSWER,
]);

module.exports = {
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  QUESTION_BANK_PAGINATION,
  QUESTION_LIMITS,
  AUTO_GRADABLE_QUESTION_TYPES,
  MANUAL_GRADABLE_QUESTION_TYPES,
  QUESTION_TYPES_REQUIRING_OPTIONS,
  QUESTION_TYPES_REQUIRING_CORRECT_ANSWER,
};