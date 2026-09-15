const { z } = require("zod");
const settingSchema = z.object({ key: z.string().trim().min(2).max(120), value: z.string().max(10000).nullable().optional() }).strict();
module.exports = { settingSchema };
