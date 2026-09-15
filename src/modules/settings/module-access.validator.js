const { z } = require("zod");
const { MODULE_KEYS } = require("./module-access.constants");

const moduleAccessSchema = z.object({
    module: z.enum(MODULE_KEYS),
    classLevelId: z.string().uuid().nullable().optional(),
    enabled: z.boolean(),
    startsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
    endsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
    blockUnpaid: z.boolean().optional().default(false),
}).strict().refine((data) => !data.startsAt || !data.endsAt || data.startsAt < data.endsAt, { message: "startsAt must be before endsAt." });

module.exports = { moduleAccessSchema };