const AppError = require("../../core/errors/AppError");
const repository = require("./module-access.repository");
const { MODULE_ACCESS_ERRORS: ERRORS, MODULE_KEYS } = require("./module-access.constants");

const parse = (record) => record ? JSON.parse(record.value) : null;
const get = async (schoolId, module, classLevelId) => parse(await repository.get(schoolId, module, classLevelId)) || { module, classLevelId: classLevelId || null, enabled: true, blockUnpaid: false, startsAt: null, endsAt: null };
const set = (schoolId, data) => repository.set(schoolId, data);
const list = async (schoolId) => {
    const policies = new Map();
    for (const policy of (await repository.findAll(schoolId)).map(parse).filter(Boolean)) {
        policies.set(`${policy.module}:${policy.classLevelId || "all"}`, policy);
    }
    for (const module of MODULE_KEYS) {
        const key = `${module}:all`;
        if (!policies.has(key)) {
            policies.set(key, { module, classLevelId: null, enabled: true, blockUnpaid: false, startsAt: null, endsAt: null });
        }
    }
    return [...policies.values()];
};
const assertAccess = async ({ schoolId, module, classLevelId, hasOutstandingBalance = false, now = new Date() }) => {
    const [specificRecord, globalRecord] = await Promise.all([
        classLevelId ? repository.get(schoolId, module, classLevelId) : null,
        repository.get(schoolId, module, null),
    ]);
    const global = parse(globalRecord) || { module, classLevelId: null, enabled: true, blockUnpaid: false, startsAt: null, endsAt: null };
    const policy = { ...global, ...(parse(specificRecord) || {}) };
    if (!policy.enabled) throw new AppError(ERRORS.MODULE_DISABLED, 403, "MODULE_DISABLED");
    const time = now.toTimeString().slice(0, 5);
    if ((policy.startsAt && time < policy.startsAt) || (policy.endsAt && time > policy.endsAt)) throw new AppError(ERRORS.OUTSIDE_TIME_WINDOW, 403, "OUTSIDE_TIME_WINDOW");
    if (policy.blockUnpaid && hasOutstandingBalance) throw new AppError(ERRORS.PAYMENT_REQUIRED, 402, "PAYMENT_REQUIRED");
    return policy;
};
module.exports = { get, set, list, assertAccess };