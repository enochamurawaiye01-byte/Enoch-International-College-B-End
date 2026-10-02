const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createEnrollmentSchema = z.object({
	studentId: uuid,
	sessionId: uuid,
	termId: uuid,
	classId: uuid,
	departmentId: uuid.nullable().optional(),
	status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN", "SUSPENDED", "TRANSFERRED"]).optional(),
}).strict();
const updateEnrollmentSchema = z.object({
	status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN", "SUSPENDED", "TRANSFERRED"]),
	completionDate: z.coerce.date().nullable().optional(),
}).strict();
const enrollmentSubjectsSchema = z.object({ subjectIds: z.array(uuid).max(100) }).strict();
module.exports = { createEnrollmentSchema, updateEnrollmentSchema, enrollmentSubjectsSchema };
