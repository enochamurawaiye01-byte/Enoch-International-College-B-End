const { z } = require("zod");
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const eventFields = { title: z.string().trim().min(1).max(200), description: z.string().trim().max(10000).nullable().optional(), imageUrl: z.string().url().nullable().optional(), location: z.string().trim().max(200).nullable().optional(), startDate: z.coerce.date(), endDate: z.coerce.date() };
const createEventSchema = z.object(eventFields).strict().refine((data) => data.startDate < data.endDate, "startDate must be before endDate.");
const updateEventSchema = z.object(eventFields).partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.").refine((data) => !data.startDate || !data.endDate || data.startDate < data.endDate, "startDate must be before endDate.");
const eventQuerySchema = z.object({ page, limit, search: z.string().trim().max(100).optional(), period: z.enum(["upcoming", "past", "all"]).default("upcoming"), status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).optional() }).strict();
const publicationSchema = z.object({ published: z.boolean() }).strict();
module.exports = { createEventSchema, updateEventSchema, eventQuerySchema, publicationSchema };
