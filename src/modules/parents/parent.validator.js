const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const personName = z.string().trim().min(2).max(50);
const createParentSchema = z.object({
	firstName: personName,
	middleName: personName.optional(),
	lastName: personName,
	email: z.string().email().optional(),
	phoneNumber: z.string().trim().min(7).max(20).optional(),
	password: z.string().min(8).optional(),
	occupation: z.string().trim().max(100).optional(),
	address: z.string().trim().max(500).optional(),
	relationship: z.string().trim().max(50).optional(),
	emergencyContact: z.string().trim().max(100).optional(),
}).strict();
const linkParentStudentSchema = z.object({
	studentId: uuid,
	relationship: z.string().trim().min(2).max(50).optional(),
	isPrimary: z.boolean().optional().default(false),
	isEmergency: z.boolean().optional().default(false),
}).strict();
module.exports = { createParentSchema, linkParentStudentSchema };
