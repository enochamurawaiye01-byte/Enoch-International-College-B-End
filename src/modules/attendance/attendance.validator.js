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

const batchAttendanceSchema = z.object({
	classId: uuid,
	sessionId: uuid,
	termId: uuid,
	date: z.coerce.date(),
	records: z.array(z.object({
		studentId: uuid,
		status,
		remarks: z.string().trim().max(500).nullable().optional(),
	}).strict()).min(1).max(200),
}).strict().superRefine((data, context) => {
	const studentIds = new Set();
	data.records.forEach(({ studentId }, index) => {
		if (studentIds.has(studentId)) {
			context.addIssue({ code: "custom", path: ["records", index, "studentId"], message: "A student may only appear once in a batch." });
		}
		studentIds.add(studentId);
	});
});

const updateAttendanceSchema = attendanceSchema.omit({ studentId: true, sessionId: true, termId: true }).partial().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const attendanceQuerySchema = z.object({ studentId: uuid.optional(), classId: uuid.optional(), sessionId: uuid.optional(), termId: uuid.optional(), date: z.coerce.date().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).strict().superRefine((data, context) => {
	if (data.from && data.to && data.from > data.to) context.addIssue({ code: "custom", path: ["to"], message: "'to' must be on or after 'from'." });
});

module.exports = { attendanceSchema, batchAttendanceSchema, updateAttendanceSchema, attendanceQuerySchema };
