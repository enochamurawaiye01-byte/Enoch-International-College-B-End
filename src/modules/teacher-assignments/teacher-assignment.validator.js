const { z } = require("zod");

const optionalUuid = z.string().uuid("Must be a valid ID.").optional().nullable();
const createTeacherAssignmentSchema = z.object({
    staffId: z.string().uuid("A valid teacher ID is required."),
    subjectId: z.string().uuid("A valid subject ID is required."),
    classId: z.string().uuid("A valid class ID is required.").optional(),
    classLevel: z.enum(["JSS", "SSS", "BOTH"]).optional(),
    sessionId: optionalUuid,
    termId: optionalUuid,
}).strict().refine((data) => Boolean(data.classId) !== Boolean(data.classLevel), {
    message: "Select one class or a JSS/SSS teaching level.",
    path: ["classLevel"],
});
const classTeacherAssignmentSchema = z.object({
    staffId: z.string().uuid("A valid teacher ID is required."),
    classId: z.string().uuid("A valid class ID is required."),
    sessionId: z.string().uuid("A valid academic session ID is required.")
}).strict();

module.exports = { createTeacherAssignmentSchema, classTeacherAssignmentSchema };