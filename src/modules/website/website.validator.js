const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const settingSchema = z.object({ key: z.string().trim().min(2).max(100), value: z.string().max(10000).nullable().optional(), isPublic: z.boolean().optional() }).strict();
const pageSchema = z.object({ slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().trim().min(1).max(200), excerpt: z.string().trim().max(500).nullable().optional(), content: z.string().trim().max(50000), status: z.enum(["DRAFT", "PUBLISHED"]).optional() }).strict();
const updatePageSchema = pageSchema.partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const sectionSchema = z.object({ key: z.string().trim().min(1).max(100), title: z.string().trim().max(200).nullable().optional(), content: z.string().max(10000).nullable().optional(), imageUrl: z.string().url().nullable().optional(), sortOrder: z.number().int().min(0).optional(), isActive: z.boolean().optional() }).strict();
module.exports = { settingSchema, pageSchema, updatePageSchema, sectionSchema, uuid };
