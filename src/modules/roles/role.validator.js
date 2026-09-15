const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const systemRole = z.enum(["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "BURSAR", "TEACHER", "STAFF", "STUDENT", "PARENT"]);
const createRoleSchema = z.object({ name: z.string().trim().min(2).max(80).regex(/^[A-Z][A-Z0-9_ -]*$/), description: z.string().trim().max(300).nullable().optional() }).strict();
const updateRoleSchema = z.object({ description: z.string().trim().max(300).nullable().optional(), isActive: z.boolean().optional() }).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const roleAssignmentSchema = z.object({ userId: uuid, roleId: uuid }).strict();
const userRoleSchema = z.object({ role: systemRole }).strict();
module.exports = { createRoleSchema, updateRoleSchema, roleAssignmentSchema, userRoleSchema };
