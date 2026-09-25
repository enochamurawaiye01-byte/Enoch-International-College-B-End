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
	firstName: z.string({ required_error: "First name is required" }).trim().min(2, "First name must be at least 2 characters").max(80, "First name is too long"),
	middleName: z.string().trim().max(80, "Middle name is too long").nullable().optional(),
	lastName: z.string({ required_error: "Last name is required" }).trim().min(2, "Last name must be at least 2 characters").max(80, "Last name is too long"),
	dateOfBirth: date.nullable().optional(),
	gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
	email: z.string().email("Please provide a valid email address").nullable().optional(),
	phoneNumber: z.string().trim().max(30, "Phone number is too long").nullable().optional(),
	address: z.string().trim().max(500, "Address is too long").nullable().optional(),
	parentName: z.string().trim().max(160, "Parent name is too long").nullable().optional(),
	parentPhone: z.string().trim().max(30, "Parent phone number is too long").nullable().optional(),
	parentEmail: z.string().email("Please provide a valid parent email address").nullable().optional(),
	parentRelationship: z.string().trim().max(80, "Parent relationship is too long").nullable().optional(),
	previousSchool: z.string().trim().max(200, "Previous school is too long").nullable().optional(),
	desiredClassId: uuid.nullable().optional(),
}).strict();

const updateAdmissionSchema = z.object({
	status: admissionStatus.optional(),
	reviewNotes: z.string().trim().max(2000).nullable().optional(),
	desiredClassId: uuid.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required to update.");

const listAdmissionSchema = z.object({
	status: admissionStatus.optional(),
	desiredClassId: uuid.optional(),
	search: z.string().trim().max(100).optional(),
}).strict();

module.exports = { createAdmissionSchema, updateAdmissionSchema, listAdmissionSchema };
