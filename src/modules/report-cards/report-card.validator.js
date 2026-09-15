const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const score = z.coerce.number().min(0).nullable().optional();
const entry = z.object({ subjectId: uuid, firstTest: score, secondTest: score, assignment: score, exam: score, teacherComment: z.string().trim().max(500).nullable().optional() }).strict();
const createReportCardSchema = z.object({ studentId: uuid, sessionId: uuid, termId: uuid, teacherComment: z.string().trim().max(1000).nullable().optional(), principalComment: z.string().trim().max(1000).nullable().optional(), entries: z.array(entry).min(1) }).strict();
const updateReportCardSchema = createReportCardSchema.omit({ studentId: true, sessionId: true, termId: true }).partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const publicationSchema = z.object({ published: z.boolean() }).strict();
module.exports = { createReportCardSchema, updateReportCardSchema, publicationSchema };
