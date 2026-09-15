const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const profileSchema = z.object({ studentId: uuid, allergies: z.string().trim().max(1000).nullable().optional(), conditions: z.string().trim().max(1000).nullable().optional(), bloodGroup: z.string().trim().max(10).nullable().optional(), genotype: z.string().trim().max(10).nullable().optional(), emergencyContact: z.string().trim().max(100).nullable().optional() }).strict();
const visitSchema = z.object({ studentId: uuid, complaint: z.string().trim().min(1).max(2000), diagnosis: z.string().trim().max(2000).nullable().optional(), treatment: z.string().trim().max(2000).nullable().optional(), medication: z.string().trim().max(1000).nullable().optional(), incidentDate: z.coerce.date().optional() }).strict();
module.exports = { profileSchema, visitSchema };
