const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createItemSchema = z.object({ itemCode: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(200), category: z.string().trim().max(100).nullable().optional(), unit: z.string().trim().min(1).max(30), location: z.string().trim().max(100).nullable().optional(), supplier: z.string().trim().max(150).nullable().optional(), reorderLevel: z.number().int().min(0).default(0) }).strict();
const movementSchema = z.object({ itemId: uuid, type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "DAMAGED", "LOST"]), quantity: z.number().int().positive(), reason: z.string().trim().max(500).nullable().optional() }).strict();
module.exports = { createItemSchema, movementSchema };
