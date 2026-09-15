const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createNotificationSchema = z.object({ userId: uuid, type: z.enum(["GENERAL", "ACADEMIC", "RESULT", "PAYMENT", "ATTENDANCE", "EXAM", "ANNOUNCEMENT", "SYSTEM"]), title: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(2000) }).strict();
module.exports = { createNotificationSchema };
