// Term validator
const { z } = require("zod");

const termTypes = ["FIRST", "SECOND", "THIRD"];

const createTermSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Term name is required."),

        type: z.enum(termTypes, {
            message: "Term type must be FIRST, SECOND, or THIRD.",
        }),

        startDate: z
            .string()
            .datetime({
                message: "Start date must be a valid ISO date.",
            })
            .transform((value) => new Date(value)),

        endDate: z
            .string()
            .datetime({
                message: "End date must be a valid ISO date.",
            })
            .transform((value) => new Date(value)),

        isActive: z.boolean().optional().default(false),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.endDate <= data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["endDate"],
                message: "Term end date must be after the start date.",
            });
        }
    });

const updateTermSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Term name is required.")
            .optional(),

        type: z
            .enum(termTypes, {
                message: "Term type must be FIRST, SECOND, or THIRD.",
            })
            .optional(),

        startDate: z
            .string()
            .datetime({
                message: "Start date must be a valid ISO date.",
            })
            .transform((value) => new Date(value))
            .optional(),

        endDate: z
            .string()
            .datetime({
                message: "End date must be a valid ISO date.",
            })
            .transform((value) => new Date(value))
            .optional(),

        isActive: z.boolean().optional(),
    })
    .strict();

module.exports = {
    createTermSchema,
    updateTermSchema,
};

