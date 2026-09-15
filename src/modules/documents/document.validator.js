const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const documentSchema = z.object({ studentId: uuid, type: z.enum(["PASSPORT", "BIRTH_CERTIFICATE", "MEDICAL_RECORD", "TRANSFER_CERTIFICATE", "REPORT_CARD", "RESULT", "TRANSCRIPT", "ID_CARD", "OTHER"]), title: z.string().trim().min(1).max(200), fileUrl: z.string().trim().max(1000).optional(), description: z.string().trim().max(1000).nullable().optional() }).strict();
module.exports = { documentSchema };
