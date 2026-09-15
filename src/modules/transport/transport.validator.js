const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const vehicleSchema = z.object({ registrationNumber: z.string().trim().min(1).max(30), name: z.string().trim().max(100).nullable().optional(), capacity: z.number().int().positive(), status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(), driverName: z.string().trim().max(100).nullable().optional() }).strict();
const routeSchema = z.object({ name: z.string().trim().min(1).max(100), fee: z.number().min(0).optional(), vehicleId: uuid.nullable().optional() }).strict();
const assignmentSchema = z.object({ studentId: uuid, routeId: uuid, vehicleId: uuid.nullable().optional(), pickupStop: z.string().trim().max(100).nullable().optional(), dropoffStop: z.string().trim().max(100).nullable().optional() }).strict();
module.exports = { vehicleSchema, routeSchema, assignmentSchema };
