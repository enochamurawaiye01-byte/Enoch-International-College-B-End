const { z } = require("zod");

const uuid = z.string().uuid("Must be a valid ID.");
const name = z.string().trim().min(2).max(50);
const createStudentSchema = z.object({
	firstName: name,
	middleName: name.optional(),
	lastName: name,
	email: z.string().email().optional(),
	phoneNumber: z.string().trim().min(7).max(20).optional(),
	password: z.string().min(8).optional(),
	admissionNumber: z.string().trim().max(50).optional(),
	currentClassId: uuid.optional().nullable(),
	status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN", "TRANSFERRED", "EXPELLED", "DECEASED"]).optional(),
}).strict();

const updateStudentSchema = z.object({
	status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN", "TRANSFERRED", "EXPELLED", "DECEASED"]).optional(),
	currentClassId: uuid.nullable().optional(),
	address: z.string().trim().max(500).nullable().optional(),
	medicalNotes: z.string().trim().max(2000).nullable().optional(),
}).strict().refine(
	(data) => Object.keys(data).length > 0,
	{ message: "At least one student field is required." }
);

module.exports = { createStudentSchema, updateStudentSchema };
