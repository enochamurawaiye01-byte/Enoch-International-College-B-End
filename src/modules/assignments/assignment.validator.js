const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createAssignmentSchema = z.object({ title: z.string().trim().min(1).max(200), instructions: z.string().trim().min(1).max(10000), attachmentUrl: z.string().url().nullable().optional(), dueDate: z.coerce.date(), maxScore: z.coerce.number().positive(), status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(), staffId: uuid, subjectId: uuid, classId: uuid, sessionId: uuid, termId: uuid }).strict();
const updateAssignmentSchema = createAssignmentSchema.partial().omit({ staffId: true }).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const submissionSchema = z.object({ content: z.string().trim().max(10000).nullable().optional(), attachmentUrl: z.string().url().nullable().optional() }).strict();
const gradeSchema = z.object({ score: z.coerce.number().min(0), feedback: z.string().trim().max(3000).nullable().optional(), status: z.enum(["GRADED", "RETURNED"]).optional() }).strict();
module.exports = { createAssignmentSchema, updateAssignmentSchema, submissionSchema, gradeSchema };
