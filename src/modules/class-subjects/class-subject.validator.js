const { z } = require("zod");

const createClassSubjectSchema = z.object({
    classId: z.string().uuid("A valid class ID is required."),
    subjectId: z.string().uuid("A valid subject ID is required."),
}).strict();

module.exports = { createClassSubjectSchema };