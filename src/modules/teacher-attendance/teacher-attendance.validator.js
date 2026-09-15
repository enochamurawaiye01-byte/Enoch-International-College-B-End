const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const attendanceSchema = z.object({
	staffId: uuid,
	termId: uuid,
	date: z.coerce.date(),
	status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]),
	arrivalTime: z.coerce.date().nullable().optional(),
	departureTime: z.coerce.date().nullable().optional(),
	remarks: z.string().trim().max(500).nullable().optional(),
}).strict();
const updateAttendanceSchema = attendanceSchema.omit({ staffId: true, termId: true }).partial().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
module.exports = { attendanceSchema, updateAttendanceSchema };
