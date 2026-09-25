const { z } = require("zod");

const subscribeSchema = z.object({
  email: z.string({ required_error: "Email is required" }).trim().email("Please enter a valid email address").max(254, "Email is too long"),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
  consent: z.boolean().optional(),
}).strict();

module.exports = {
  subscribeSchema,
};
