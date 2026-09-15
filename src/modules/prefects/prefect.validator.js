const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createPositionSchema = z.object({ name: z.string().trim().min(2).max(100), scope: z.enum(["CLASS", "SCHOOL"]), description: z.string().trim().max(300).nullable().optional(), eligibility: z.string().trim().max(300).nullable().optional() }).strict();
const createAssignmentSchema = z.object({ studentId: uuid, positionId: uuid, classId: uuid.nullable().optional(), sessionId: uuid, startDate: z.coerce.date(), endDate: z.coerce.date().nullable().optional() }).strict();
const updateAssignmentSchema = z.object({ endDate: z.coerce.date().nullable().optional(), status: z.enum(["ACTIVE", "ENDED", "REVOKED"]).optional() }).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
module.exports = { createPositionSchema, createAssignmentSchema, updateAssignmentSchema };
