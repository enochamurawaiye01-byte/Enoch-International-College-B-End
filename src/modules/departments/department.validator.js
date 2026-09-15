const { z } = require("zod");

const createDepartmentSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "Department name is required.")
			.max(100, "Department name is too long."),
		description: z
			.string()
			.trim()
			.max(500, "Description is too long.")
			.optional(),
	})
	.strict();

const updateDepartmentSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "Department name is required.")
			.max(100, "Department name is too long.")
			.optional(),
		description: z
			.string()
			.trim()
			.max(500, "Description is too long.")
			.optional(),
	})
	.strict();

module.exports = {
	createDepartmentSchema,
	updateDepartmentSchema,
};
