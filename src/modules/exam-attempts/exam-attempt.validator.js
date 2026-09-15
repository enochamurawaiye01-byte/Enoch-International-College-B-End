const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const startAttemptSchema = z.object({ examId: uuid }).strict();
const answerSchema = z.object({ questionId: uuid, selectedAnswer: z.string().trim().max(1000).nullable() }).strict();
const submitAttemptSchema = z.object({ answers: z.array(answerSchema).max(1000) }).strict();
module.exports = { startAttemptSchema, submitAttemptSchema };
