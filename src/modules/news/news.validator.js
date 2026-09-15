const { z } = require("zod");
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const createNewsSchema = z.object({ title: z.string().trim().min(1).max(200), slug: z.string().trim().min(2).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), content: z.string().trim().min(1).max(50000), excerpt: z.string().trim().max(500).nullable().optional(), featuredImageUrl: z.string().url().nullable().optional(), featured: z.boolean().optional() }).strict();
const updateNewsSchema = createNewsSchema.partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const newsQuerySchema = z.object({ page, limit, search: z.string().trim().max(100).optional(), featured: z.enum(["true", "false"]).optional(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional() }).strict();
const publicationSchema = z.object({ published: z.boolean() }).strict();
module.exports = { createNewsSchema, updateNewsSchema, newsQuerySchema, publicationSchema };
