const { z } = require("zod");
const auditQuerySchema = z.object({ action: z.string().trim().max(100).optional(), entity: z.string().trim().max(100).optional(), userId: z.string().uuid().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).strict();
module.exports = { auditQuerySchema };
