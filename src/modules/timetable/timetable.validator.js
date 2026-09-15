const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const slotSchema = z.object({ subjectId: uuid, staffId: uuid.nullable().optional(), day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), room: z.string().trim().max(100).nullable().optional(), isActive: z.boolean().optional() }).strict();
const createTimetableSchema = z.object({ sessionId: uuid, termId: uuid, classId: uuid, name: z.string().trim().max(100).nullable().optional(), isActive: z.boolean().optional() }).strict();
const updateTimetableSchema = createTimetableSchema.partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
module.exports = { slotSchema, createTimetableSchema, updateTimetableSchema };
