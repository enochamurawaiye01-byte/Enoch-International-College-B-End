const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const optionSchema = z.object({
	optionKey: z.string().trim().min(1).max(5),
	optionText: z.string().trim().min(1).max(1000),
	isCorrect: z.boolean().optional().default(false),
}).strict();
const questionFields = {
	examId: uuid,
	questionText: z.string().trim().min(1).max(5000),
	marks: z.number().positive().optional(),
	explanation: z.string().trim().max(2000).nullable().optional(),
	options: z.array(optionSchema).min(2).max(10).optional().default([]),
};
const createQuestionSchema = z.object(questionFields).strict().superRefine((data, ctx) => {
	if (data.options.length > 0 && !data.options.some((option) => option.isCorrect)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one option must be correct.", path: ["options"] });
});
const updateQuestionSchema = z.object(questionFields).omit({ examId: true }).partial().strict();
module.exports = { createQuestionSchema, updateQuestionSchema };
