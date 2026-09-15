const { z } = require("zod");

const uuid = z.string().uuid("Must be a valid ID.");
const createFeeAccountSchema = z.object({
	studentId: uuid,
	feeStructureId: uuid,
	dueDate: z.coerce.date().nullable().optional(),
}).strict();

module.exports = { createFeeAccountSchema };
