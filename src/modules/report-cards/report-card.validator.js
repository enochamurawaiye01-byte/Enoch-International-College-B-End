const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const score = z.coerce.number().min(0).nullable().optional();
const entry = z.object({ subjectId: uuid, firstTest: score, secondTest: score, assignment: score, exam: score, teacherComment: z.string().trim().max(500).nullable().optional() }).strict();
const createReportCardSchema = z.object({ studentId: uuid, sessionId: uuid, termId: uuid, teacherComment: z.string().trim().max(1000).nullable().optional(), principalComment: z.string().trim().max(1000).nullable().optional(), entries: z.array(entry).min(1) }).strict();
const updateReportCardSchema = createReportCardSchema.omit({ studentId: true, sessionId: true, termId: true }).partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const publicationSchema = z.object({ published: z.boolean() }).strict();
const assessmentConfigurationSchema = z.object({
	firstTestMax: z.coerce.number().positive().max(1000),
	secondTestMax: z.coerce.number().positive().max(1000),
	examMax: z.coerce.number().positive().max(1000),
	gradeBands: z.array(z.object({
		minimum: z.coerce.number().min(0).max(100),
		grade: z.string().trim().min(1).max(8),
		remark: z.string().trim().min(1).max(80)
	}).strict()).min(1).max(12)
}).strict();
const resultEntrySchema = z.object({
	studentId: uuid,
	firstTest: z.coerce.number().min(0),
	secondTest: z.coerce.number().min(0),
	exam: z.coerce.number().min(0),
	teacherComment: z.string().trim().max(500).optional().nullable()
}).strict();
const batchResultSchema = z.object({
	classId: uuid,
	subjectId: uuid,
	sessionId: uuid,
	termId: uuid,
	reason: z.string().trim().min(3).max(1000).optional(),
	entries: z.array(resultEntrySchema).min(1).max(500)
}).strict();
module.exports = { createReportCardSchema, updateReportCardSchema, publicationSchema, assessmentConfigurationSchema, batchResultSchema };
