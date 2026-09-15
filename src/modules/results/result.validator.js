const { z } = require("zod");
const publishResultSchema = z.object({ published: z.boolean() }).strict();
module.exports = { publishResultSchema };
