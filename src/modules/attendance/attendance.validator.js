const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const status = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]);

const attendanceSchema = z.object({
	studentId: uuid,
	sessionId: uuid,
	termId: uuid,
	date: z.coerce.date(),
	status,
	arrivalTime: z.coerce.date().nullable().optional(),
	departureTime: z.coerce.date().nullable().optional(),
	remarks: z.string().trim().max(500).nullable().optional(),
}).strict();

const updateAttendanceSchema = attendanceSchema.omit({ studentId: true, sessionId: true, termId: true }).partial().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const attendanceQuerySchema = z.object({ studentId: uuid.optional(), sessionId: uuid.optional(), termId: uuid.optional(), date: z.coerce.date().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).strict();

module.exports = { attendanceSchema, updateAttendanceSchema, attendanceQuerySchema };
