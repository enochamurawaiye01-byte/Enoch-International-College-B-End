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

        classGroup: z.enum(["JSS", "SSS"]),
        departmentIds: z.array(z.string().uuid("Department ID must be valid.")).optional().default([]),

        description: z
            .string()
            .trim()
            .max(500, "Description is too long.")
            .optional(),

        departmentId: z.string().uuid("Department ID must be valid.").nullable().optional(),

        isActive: z
            .boolean()
            .optional()
            .default(true),
    }).superRefine((data, context) => {
        if (data.classGroup === "SSS" && !data.departmentIds.length) {
            context.addIssue({ code: "custom", path: ["departmentIds"], message: "Select at least one senior secondary department." });
        }
        if (data.classGroup === "JSS" && data.departmentIds.length) {
            context.addIssue({ code: "custom", path: ["departmentIds"], message: "Departments can only be selected for senior secondary subjects." });
        }
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

        classGroup: z.enum(["JSS", "SSS"]).optional(),
        departmentIds: z.array(z.string().uuid("Department ID must be valid.")).optional(),

        description: z
            .string()
            .trim()
            .max(500, "Description is too long.")
            .optional(),

        departmentId: z.string().uuid("Department ID must be valid.").nullable().optional(),

        isActive: z
            .boolean()
            .optional(),
    })
    .strict();

module.exports = {
    createSubjectSchema,
    updateSubjectSchema,
};