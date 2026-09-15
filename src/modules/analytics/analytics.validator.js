const { z } = require("zod");
const analyticsQuerySchema = z.object({ sessionId: z.string().uuid().optional(), termId: z.string().uuid().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).strict();
module.exports = { analyticsQuerySchema };
