const { z } = require("zod");

const financialReportQuerySchema = z.object({
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	sessionId: z.string().uuid().optional(),
	termId: z.string().uuid().optional(),
	classId: z.string().uuid().optional(),
	studentId: z.string().uuid().optional(),
	method: z.enum(["CASH", "BANK_TRANSFER", "POS", "CARD", "ONLINE", "CHEQUE", "OTHER"]).optional(),
}).refine((data) => !data.from || !data.to || data.from <= data.to, { message: "from must be before to" });

module.exports = { financialReportQuerySchema };
