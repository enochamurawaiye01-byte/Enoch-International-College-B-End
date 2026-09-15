const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const item = z.object({
	description: z.string().trim().min(1).max(200),
	quantity: z.number().int().positive().default(1),
	unitAmount: z.number().positive(),
}).strict();
const createInvoiceSchema = z.object({
	studentId: uuid,
	sessionId: uuid.nullable().optional(),
	termId: uuid.nullable().optional(),
	feeAccountId: uuid.nullable().optional(),
	items: z.array(item).min(1).max(100),
	discount: z.number().min(0).optional().default(0),
	dueDate: z.coerce.date().nullable().optional(),
	description: z.string().trim().max(1000).nullable().optional(),
}).strict();
const updateInvoiceSchema = z.object({
	dueDate: z.coerce.date().nullable().optional(),
	description: z.string().trim().max(1000).nullable().optional(),
	discount: z.number().min(0).optional(),
	status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]).optional(),
}).strict();
module.exports = { createInvoiceSchema, updateInvoiceSchema };
