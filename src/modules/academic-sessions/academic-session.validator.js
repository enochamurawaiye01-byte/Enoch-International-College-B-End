const { z } = require("zod");

const sessionNameRegex = /^\d{4}\/\d{4}$/;

const createAcademicSessionSchema = z
    .object({
        name: z
            .string()
            .trim()
            .regex(
                sessionNameRegex,
                "Session format must be YYYY/YYYY."
            ),

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
    .superRefine((data, ctx) => {
        const [startYear, endYear] = data.name
            .split("/")
            .map(Number);

        if (endYear !== startYear + 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["name"],
                message:
                    "Ending year must be exactly one year after starting year.",
            });
        }

        if (data.endDate <= data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["endDate"],
                message: "End date must be after the start date.",
            });
        }

        if (data.startDate.getFullYear() !== startYear) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["startDate"],
                message:
                    "Start date does not match the academic session.",
            });
        }

        if (data.endDate.getFullYear() < endYear) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["endDate"],
                message:
                    "End date does not match the academic session.",
            });
        }
    });

const updateAcademicSessionSchema = z
    .object({
        name: z
            .string()
            .trim()
            .regex(
                sessionNameRegex,
                "Session format must be YYYY/YYYY."
            )
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
    createAcademicSessionSchema,
    updateAcademicSessionSchema,
};