const { z } = require("zod");

const createClassSchema = z
    .object({
        level: z
            .string()
            .trim()
            .min(2, "Class level is required.")
            .max(50, "Class level is too long."),

        arm: z
            .string()
            .trim()
            .min(1, "Class arm is required.")
            .max(50, "Class arm is too long.")
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

const updateClassSchema = z
    .object({
        level: z
            .string()
            .trim()
            .min(2, "Class level is required.")
            .max(50, "Class level is too long.")
            .optional(),

        arm: z
            .string()
            .trim()
            .min(1, "Class arm is required.")
            .max(50, "Class arm is too long.")
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
    createClassSchema,
    updateClassSchema,
};