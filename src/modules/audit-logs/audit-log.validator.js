const { z } = require("zod");
const auditQuerySchema = z.object({ action: z.string().trim().max(100).optional(), entity: z.string().trim().max(100).optional(), module: z.string().trim().max(100).optional(), search: z.string().trim().max(100).optional(), userId: z.string().uuid().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional() }).strict();
module.exports = { auditQuerySchema };
