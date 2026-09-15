const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const status = z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "ARCHIVED"]);
const lessonFields = {
	title: z.string().trim().min(1).max(200),
	content: z.string().trim().min(1).max(10000),
	objectives: z.string().trim().max(3000).nullable().optional(),
	resources: z.string().trim().max(3000).nullable().optional(),
	teacherNotes: z.string().trim().max(3000).nullable().optional(),
	lessonDate: z.coerce.date(),
	status: status.optional(),
	staffId: uuid,
	subjectId: uuid,
	classId: uuid,
	sessionId: uuid,
	termId: uuid,
};
const createLessonSchema = z.object(lessonFields).strict();
const updateLessonSchema = z.object({ ...lessonFields, staffId: uuid.optional(), subjectId: uuid.optional(), classId: uuid.optional(), sessionId: uuid.optional(), termId: uuid.optional() }).partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
module.exports = { createLessonSchema, updateLessonSchema };
