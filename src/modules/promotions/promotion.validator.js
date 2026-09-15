const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createPromotionSchema = z.object({
    studentId: uuid,
    fromClassId: uuid,
    toClassId: uuid.nullable().optional(),
    sessionId: uuid,
    status: z.enum(["PROMOTED", "NOT_PROMOTED", "CONDITIONAL", "GRADUATED", "WITHDRAWN"]),
    average: z.number().min(0).max(100).nullable().optional(),
    remarks: z.string().trim().max(1000).nullable().optional(),
}).strict();
module.exports = { createPromotionSchema };