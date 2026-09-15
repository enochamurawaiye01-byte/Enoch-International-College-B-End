const { z } = require("zod");
const createAnnouncementSchema = z.object({ title: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(10000), audience: z.enum(["ALL", "STUDENTS", "TEACHERS", "PARENTS", "STAFF", "MANAGEMENT", "ADMINS"]).optional(), publishAt: z.coerce.date().nullable().optional(), expiresAt: z.coerce.date().nullable().optional() }).strict();
const updateAnnouncementSchema = createAnnouncementSchema.partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const publicationSchema = z.object({ published: z.boolean() }).strict();
module.exports = { createAnnouncementSchema, updateAnnouncementSchema, publicationSchema };
