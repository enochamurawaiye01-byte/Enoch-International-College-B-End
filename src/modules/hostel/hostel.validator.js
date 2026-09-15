const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const hostelSchema = z.object({ name: z.string().trim().min(1).max(100), gender: z.string().trim().max(30).nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE"]).optional() }).strict();
const roomSchema = z.object({ hostelId: uuid, name: z.string().trim().min(1).max(50), capacity: z.number().int().positive() }).strict();
const bedSchema = z.object({ roomId: uuid, bedCode: z.string().trim().min(1).max(30) }).strict();
const allocationSchema = z.object({ bedId: uuid, studentId: uuid, fee: z.number().min(0).optional() }).strict();
const checkoutSchema = z.object({ checkOut: z.coerce.date().optional() }).strict();
module.exports = { hostelSchema, roomSchema, bedSchema, allocationSchema, checkoutSchema };
