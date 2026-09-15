const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const examinationFields = {
	title: z.string().trim().min(2).max(200),
	description: z.string().trim().max(2000).nullable().optional(),
	sessionId: uuid,
	termId: uuid,
	classId: uuid,
	subjectId: uuid,
	durationMinutes: z.number().int().min(1).max(600),
	totalMarks: z.number().positive().max(10000),
	passMark: z.number().min(0).max(10000),
	questionsPerStudent: z.number().int().positive().optional().nullable(),
	defaultQuestionMark: z.number().positive().max(1000).optional().nullable(),
	shuffleQuestions: z.boolean().optional().default(true),
	resultsVisible: z.boolean().optional().default(false),
	startTime: z.coerce.date().nullable().optional(),
	endTime: z.coerce.date().nullable().optional(),
	instructions: z.string().trim().max(5000).nullable().optional(),
};
const createExaminationSchema = z.object(examinationFields).strict().refine((data) => data.passMark <= data.totalMarks, { message: "Pass mark cannot exceed total marks.", path: ["passMark"] });

const updateExaminationSchema = z.object(examinationFields).partial().extend({
	status: z.enum(["DRAFT", "PUBLISHED", "ONGOING", "CLOSED", "MARKED", "ARCHIVED"]).optional(),
}).strict();
module.exports = { createExaminationSchema, updateExaminationSchema };
