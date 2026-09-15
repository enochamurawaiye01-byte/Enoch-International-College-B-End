const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const receiptStatusSchema = z.object({ status: z.enum(["ISSUED", "VOIDED"]) }).strict();
const receiptIdSchema = z.object({ paymentId: uuid }).strict();
module.exports = { receiptStatusSchema, receiptIdSchema };
