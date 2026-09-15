// QuestionBank utils
/**
 * Question Bank Utility Functions
 *
 * Reusable helper functions for Question Bank operations.
 */

const {
  QUESTION_TYPES,
  AUTO_GRADABLE_QUESTION_TYPES,
  MANUAL_GRADABLE_QUESTION_TYPES,
  QUESTION_TYPES_REQUIRING_OPTIONS,
} = require("../constants/questionBank");

/**
 * Check whether a question type is valid.
 */
const isValidQuestionType = (type) => {
  if (!type) return false;

  return Object.values(QUESTION_TYPES).includes(type);
};

/**
 * Check whether a question can be automatically graded.
 */
const isAutoGradable = (type) => {
  return AUTO_GRADABLE_QUESTION_TYPES.includes(type);
};

/**
 * Check whether a question requires manual grading.
 */
const isManualGradable = (type) => {
  return MANUAL_GRADABLE_QUESTION_TYPES.includes(type);
};

/**
 * Check whether a question type requires options.
 */
const requiresOptions = (type) => {
  return QUESTION_TYPES_REQUIRING_OPTIONS.includes(type);
};

/**
 * Normalize question options.
 *
 * Accepts:
 * - Array
 * - JSON string containing an array
 * - null/undefined
 */
const normalizeOptions = (options) => {
  if (!options) return [];

  if (Array.isArray(options)) {
    return options;
  }

  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

/**
 * Remove unnecessary whitespace from question text.
 */
const normalizeQuestionText = (text) => {
  if (typeof text !== "string") {
    return text;
  }

  return text.trim().replace(/\s+/g, " ");
};

/**
 * Normalize a correct answer.
 */
const normalizeCorrectAnswer = (answer) => {
  if (answer === null || answer === undefined) {
    return null;
  }

  if (typeof answer === "string") {
    return answer.trim();
  }

  return answer;
};

/**
 * Validate that an MCQ has enough options.
 */
const hasValidOptions = (options, minimumOptions = 2) => {
  const normalizedOptions = normalizeOptions(options);

  return normalizedOptions.length >= minimumOptions;
};

/**
 * Check whether the correct answer exists among the supplied options.
 *
 * Supports both:
 * - ["A", "B", "C", "D"]
 * - [{ label: "A", text: "..." }, ...]
 */
const isCorrectAnswerInOptions = (options, correctAnswer) => {
  const normalizedOptions = normalizeOptions(options);

  if (!normalizedOptions.length || correctAnswer === null) {
    return false;
  }

  const answer = String(correctAnswer).trim().toLowerCase();

  return normalizedOptions.some((option) => {
    if (typeof option === "string") {
      return option.trim().toLowerCase() === answer;
    }

    if (option && typeof option === "object") {
      const values = [
        option.value,
        option.label,
        option.key,
        option.text,
        option.id,
      ];

      return values.some(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim().toLowerCase() === answer
      );
    }

    return false;
  });
};

/**
 * Calculate the total marks of a collection of questions.
 */
const calculateTotalMarks = (questions = []) => {
  if (!Array.isArray(questions)) {
    return 0;
  }

  return questions.reduce((total, question) => {
    const marks = Number(question?.marks || 0);

    return total + (Number.isFinite(marks) ? marks : 0);
  }, 0);
};

/**
 * Calculate the percentage score.
 */
const calculatePercentage = (score, totalMarks) => {
  const numericScore = Number(score);
  const numericTotalMarks = Number(totalMarks);

  if (
    !Number.isFinite(numericScore) ||
    !Number.isFinite(numericTotalMarks) ||
    numericTotalMarks <= 0
  ) {
    return 0;
  }

  return Number(((numericScore / numericTotalMarks) * 100).toFixed(2));
};

/**
 * Determine whether a score is a pass.
 */
const isPassingScore = (score, passMark) => {
  const numericScore = Number(score);
  const numericPassMark = Number(passMark);

  if (!Number.isFinite(numericScore) || !Number.isFinite(numericPassMark)) {
    return false;
  }

  return numericScore >= numericPassMark;
};

/**
 * Shuffle an array using Fisher-Yates.
 *
 * Returns a new array without modifying the original.
 */
const shuffleQuestions = (questions = []) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  const shuffled = [...questions];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i],
    ];
  }

  return shuffled;
};

/**
 * Select a specific number of random questions.
 */
const selectRandomQuestions = (questions = [], count) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  const requestedCount = Number(count);

  if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
    return [];
  }

  return shuffleQuestions(questions).slice(0, Math.floor(requestedCount));
};

/**
 * Remove correct answers before sending questions to students.
 *
 * This prevents sensitive answer data from being exposed
 * through student-facing examination endpoints.
 */
const sanitizeQuestionForStudent = (question) => {
  if (!question || typeof question !== "object") {
    return question;
  }

  const sanitized = { ...question };

  delete sanitized.correctAnswer;
  delete sanitized.answer;
  delete sanitized.explanation;

  return sanitized;
};

/**
 * Sanitize multiple questions for students.
 */
const sanitizeQuestionsForStudent = (questions = []) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map(sanitizeQuestionForStudent);
};

/**
 * Remove internal/sensitive Question Bank fields.
 */
const sanitizeQuestionForResponse = (question) => {
  if (!question || typeof question !== "object") {
    return question;
  }

  return {
    ...question,
  };
};

module.exports = {
  isValidQuestionType,
  isAutoGradable,
  isManualGradable,
  requiresOptions,
  normalizeOptions,
  normalizeQuestionText,
  normalizeCorrectAnswer,
  hasValidOptions,
  isCorrectAnswerInOptions,
  calculateTotalMarks,
  calculatePercentage,
  isPassingScore,
  shuffleQuestions,
  selectRandomQuestions,
  sanitizeQuestionForStudent,
  sanitizeQuestionsForStudent,
  sanitizeQuestionForResponse,
};