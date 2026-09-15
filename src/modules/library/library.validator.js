const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createBookSchema = z.object({ title: z.string().trim().min(1).max(200), author: z.string().trim().min(1).max(150), category: z.string().trim().max(100).nullable().optional(), isbn: z.string().trim().max(30).nullable().optional(), description: z.string().trim().max(2000).nullable().optional() }).strict();
const createCopySchema = z.object({ bookId: uuid, copyCode: z.string().trim().min(1).max(50) }).strict();
const issueLoanSchema = z.object({ copyId: uuid, studentId: uuid.nullable().optional(), staffId: uuid.nullable().optional(), dueDate: z.coerce.date() }).strict().refine((data) => Boolean(data.studentId) !== Boolean(data.staffId), { message: "Provide exactly one student or staff borrower." });
const returnLoanSchema = z.object({ returnDate: z.coerce.date().optional(), fine: z.number().min(0).optional() }).strict();
module.exports = { createBookSchema, createCopySchema, issueLoanSchema, returnLoanSchema };
