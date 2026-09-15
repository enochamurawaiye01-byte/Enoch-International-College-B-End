const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const sendMessageSchema = z.object({ receiverId: uuid, subject: z.string().trim().max(200).nullable().optional(), body: z.string().trim().min(1).max(10000) }).strict();
module.exports = { sendMessageSchema };
