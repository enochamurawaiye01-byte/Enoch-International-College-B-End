const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const roleReference = z.union([
  uuid,
  z.string().trim().min(2).max(80).regex(/^[A-Z][A-Z0-9_ -]*$/)
]);
const systemRole = z.enum(["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "BURSAR", "TEACHER", "STAFF", "STUDENT", "PARENT"]);
const createRoleSchema = z.object({ name: z.string().trim().min(2).max(80).regex(/^[A-Z][A-Z0-9_ -]*$/), description: z.string().trim().max(300).nullable().optional() }).strict();
const updateRoleSchema = z.object({ description: z.string().trim().max(300).nullable().optional(), isActive: z.boolean().optional() }).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const roleAssignmentSchema = z.object({
  userId: uuid,
  roleId: roleReference.optional(),
  roleIds: z.array(roleReference).min(1).max(50).optional()
}).strict()
  .refine((data) => Boolean(data.roleId) !== Boolean(data.roleIds), "Provide either roleId or a non-empty roleIds array.")
  .refine((data) => !data.roleIds || new Set(data.roleIds).size === data.roleIds.length, "Role assignments must not contain duplicates.");
const roleRevokeSchema = z.object({
  userId: uuid,
  roleId: roleReference.optional(),
  roleName: roleReference.optional()
}).strict().refine((data) => Boolean(data.roleId) !== Boolean(data.roleName), "Provide either roleId or roleName.");
const userRoleSchema = z.object({ role: systemRole }).strict();
module.exports = { createRoleSchema, updateRoleSchema, roleAssignmentSchema, roleRevokeSchema, userRoleSchema };
