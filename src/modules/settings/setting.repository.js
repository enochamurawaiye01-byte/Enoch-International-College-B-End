const { prisma } = require("../../config/database");
const list = (schoolId) => prisma.schoolSetting.findMany({ where: { schoolId }, orderBy: { key: "asc" } });
const set = (schoolId, data) => prisma.schoolSetting.upsert({ where: { schoolId_key: { schoolId, key: data.key } }, update: { value: data.value ?? null }, create: { schoolId, key: data.key, value: data.value ?? null } });
module.exports = { list, set };
