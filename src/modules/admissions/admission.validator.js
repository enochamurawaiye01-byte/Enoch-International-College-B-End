const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const date = z.coerce.date();

const admissionStatus = z.enum([
	"APPLIED",
	"UNDER_REVIEW",
	"APPROVED",
	"REJECTED",
	"CONVERTED",
	"WITHDRAWN",
]);

const createAdmissionSchema = z.object({
	firstName: z.string().trim().min(1).max(80),
	middleName: z.string().trim().max(80).nullable().optional(),
	lastName: z.string().trim().min(1).max(80),
	dateOfBirth: date.nullable().optional(),
	gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
	email: z.string().email().nullable().optional(),
	phoneNumber: z.string().trim().max(30).nullable().optional(),
	address: z.string().trim().max(500).nullable().optional(),
	parentName: z.string().trim().max(160).nullable().optional(),
	parentPhone: z.string().trim().max(30).nullable().optional(),
	parentEmail: z.string().email().nullable().optional(),
	parentRelationship: z.string().trim().max(80).nullable().optional(),
	previousSchool: z.string().trim().max(200).nullable().optional(),
	desiredClassId: uuid.nullable().optional(),
}).strict();

const updateAdmissionSchema = z.object({
	status: admissionStatus.optional(),
	reviewNotes: z.string().trim().max(2000).nullable().optional(),
	desiredClassId: uuid.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");

const listAdmissionSchema = z.object({
	status: admissionStatus.optional(),
	desiredClassId: uuid.optional(),
	search: z.string().trim().max(100).optional(),
}).strict();

module.exports = { createAdmissionSchema, updateAdmissionSchema, listAdmissionSchema };
