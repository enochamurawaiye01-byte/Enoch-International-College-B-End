const { z } = require("zod");

const uuid = z.string().uuid("Must be a valid ID.");
const paymentMethod = z.enum(["CASH", "BANK_TRANSFER", "POS", "CARD", "ONLINE", "CHEQUE", "OTHER"]);

const createPaymentSchema = z.object({
	studentId: uuid,
	invoiceId: uuid.nullable().optional(),
	feeAccountId: uuid.nullable().optional(),
	amount: z.number().positive(),
	method: paymentMethod,
	transactionReference: z.string().trim().max(100).nullable().optional(),
	paymentDate: z.coerce.date().optional(),
	notes: z.string().trim().max(1000).nullable().optional(),
}).strict().refine(
	(data) => data.invoiceId || data.feeAccountId,
	{ message: "Payment must reference an invoice or fee account." }
);

const verifyPaymentSchema = z.object({
	status: z.enum(["PAID", "CANCELLED"]),
}).strict();

const paystackInitializeSchema = z.object({
	studentId: uuid,
	invoiceId: uuid.nullable().optional(),
	feeAccountId: uuid.nullable().optional(),
	amount: z.number().positive().optional(),
}).strict().refine(
	(data) => data.invoiceId || data.feeAccountId,
	{ message: "Paystack payment must reference an invoice or fee account." }
);

module.exports = { createPaymentSchema, verifyPaymentSchema, paystackInitializeSchema };
