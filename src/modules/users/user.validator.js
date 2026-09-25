const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const roles = ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "BURSAR", "TEACHER", "STAFF", "STUDENT", "PARENT"];
const statuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "DEACTIVATED"];
const createUserSchema = z.object({
	fullName: z.string({ required_error: "Full name is required" }).trim().min(2, "Full name must be at least 2 characters").max(100, "Full name cannot exceed 100 characters"),
	email: z.string({ required_error: "Email is required" }).email("Please enter a valid email address").max(254, "Email is too long"),
	phoneNumber: z.string().trim().max(30, "Phone number cannot exceed 30 characters").nullable().optional(),
	password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters long").max(128, "Password cannot exceed 128 characters"),
	role: z.enum(roles, { invalid_type_error: "Invalid user role specified" }).default("STAFF"),
	status: z.enum(statuses, { invalid_type_error: "Invalid status specified" }).optional()
}).strict();

const updateUserSchema = z.object({
	fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name cannot exceed 100 characters").optional(),
	phoneNumber: z.string().trim().max(30, "Phone number cannot exceed 30 characters").nullable().optional(),
	status: z.enum(statuses).optional()
}).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required to update user.");

const roleSchema = z.object({ role: z.enum(roles, { required_error: "Role is required" }) }).strict();
const statusSchema = z.object({ status: z.enum(statuses, { required_error: "Status is required" }) }).strict();
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters long").max(128) }).strict();

module.exports = { createUserSchema, updateUserSchema, roleSchema, statusSchema, passwordSchema, uuid };
