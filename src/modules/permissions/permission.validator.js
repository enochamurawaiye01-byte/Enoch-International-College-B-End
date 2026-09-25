const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const action = z.enum(["VIEW", "CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE", "APPROVE", "REJECT", "PUBLISH", "EXPORT", "MANAGE"]);
const createPermissionSchema = z.object({ key: z.string().trim().min(3).max(120).regex(/^[a-z0-9-_]+[:.][a-z0-9-_]+$/i, "Permission key format must be module:action (e.g. fees:manage or exams.publish)"), module: z.string().trim().min(2).max(60), action, description: z.string().trim().max(300).nullable().optional() }).strict();
const updatePermissionSchema = z.object({ description: z.string().trim().max(300).nullable().optional(), isActive: z.boolean().optional() }).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const assignmentSchema = z.object({ permissionId: uuid, userId: uuid.optional(), roleId: uuid.optional() }).strict().refine((data) => Boolean(data.userId) !== Boolean(data.roleId), "Provide exactly one of userId or roleId.");
module.exports = { createPermissionSchema, updatePermissionSchema, assignmentSchema };
