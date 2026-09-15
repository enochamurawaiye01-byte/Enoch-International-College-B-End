// Subject validator
const { z } = require("zod");

// Create subject validation
const createSubjectSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Subject name is required.")
            .max(100, "Subject name is too long."),

        code: z
            .string()
            .trim()
            .min(2, "Subject code is required.")
            .max(20, "Subject code is too long.")
            .transform((value) => value.toUpperCase()),

        description: z
            .string()
            .trim()
            .max(500, "Description is too long.")
            .optional(),

        isActive: z
            .boolean()
            .optional()
            .default(true),
    })
    .strict();

// Update subject validation
const updateSubjectSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Subject name is required.")
            .max(100, "Subject name is too long.")
            .optional(),

        code: z
            .string()
            .trim()
            .min(2, "Subject code is required.")
            .max(20, "Subject code is too long.")
            .transform((value) => value.toUpperCase())
            .optional(),

        description: z
            .string()
            .trim()
            .max(500, "Description is too long.")
            .optional(),

        isActive: z
            .boolean()
            .optional(),
    })
    .strict();

module.exports = {
    createSubjectSchema,
    updateSubjectSchema,
};