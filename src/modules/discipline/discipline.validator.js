const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const incidentSchema = z.object({ studentId: uuid, incidentType: z.string().trim().min(1).max(100), description: z.string().trim().min(1).max(3000), actionTaken: z.string().trim().max(2000).nullable().optional(), parentNotified: z.boolean().optional().default(false), status: z.enum(["OPEN", "RESOLVED", "CLOSED"]).optional(), incidentDate: z.coerce.date().optional() }).strict();
const resolveSchema = z.object({ actionTaken: z.string().trim().max(2000).nullable().optional() }).strict();
module.exports = { incidentSchema, resolveSchema };
