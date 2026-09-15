const { prisma } = require("../../config/database");

const keyFor = (module, classLevelId) => `module-access:${module}:${classLevelId || "all"}`;
const get = (schoolId, module, classLevelId) => prisma.schoolSetting.findUnique({ where: { schoolId_key: { schoolId, key: keyFor(module, classLevelId) } } });
const set = (schoolId, data) => prisma.schoolSetting.upsert({ where: { schoolId_key: { schoolId, key: keyFor(data.module, data.classLevelId) } }, update: { value: JSON.stringify(data) }, create: { schoolId, key: keyFor(data.module, data.classLevelId), value: JSON.stringify(data) } });
const findAll = (schoolId) => prisma.schoolSetting.findMany({ where: { schoolId, key: { startsWith: "module-access:" } }, orderBy: { key: "asc" } });
module.exports = { get, set, findAll };