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

        startDate: z.coerce.date({ message: "Start date must be a valid date." }),

        endDate: z.coerce.date({ message: "End date must be a valid date." }),

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

        if (!(data.startDate instanceof Date) || Number.isNaN(data.startDate.getTime()) || !(data.endDate instanceof Date) || Number.isNaN(data.endDate.getTime())) {
            return;
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

        startDate: z.coerce.date({ message: "Start date must be a valid date." }).optional(),

        endDate: z.coerce.date({ message: "End date must be a valid date." }).optional(),

        isActive: z.boolean().optional(),
    })
    .strict();

module.exports = {
    createAcademicSessionSchema,
    updateAcademicSessionSchema,
};