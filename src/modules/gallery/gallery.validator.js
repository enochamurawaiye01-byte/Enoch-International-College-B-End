const { z } = require("zod");
const uuid = z.string().uuid("Must be a valid ID.");
const createAlbumSchema = z.object({ name: z.string().trim().min(1).max(150), slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(1000).nullable().optional(), coverImageUrl: z.string().url().nullable().optional() }).strict();
const updateAlbumSchema = createAlbumSchema.partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const imageSchema = z.object({ imageUrl: z.string().url().optional(), caption: z.string().trim().max(500).nullable().optional(), featured: z.boolean().optional(), sortOrder: z.number().int().min(0).optional() }).strict();
const publicationSchema = z.object({ published: z.boolean() }).strict();
module.exports = { createAlbumSchema, updateAlbumSchema, imageSchema, publicationSchema };
