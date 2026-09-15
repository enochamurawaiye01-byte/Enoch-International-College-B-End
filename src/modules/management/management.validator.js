const { z } = require("zod");
const dashboardQuerySchema = z.object({ sessionId: z.string().uuid().optional(), termId: z.string().uuid().optional() }).strict();
module.exports = { dashboardQuerySchema };
