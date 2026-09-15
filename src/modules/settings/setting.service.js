const AppError = require("../../core/errors/AppError");
const repository = require("./setting.repository");
const assertAdmin = (user) => { if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) throw new AppError("Settings administration access required.", 403, "SETTINGS_ACCESS_DENIED"); };
const list = (schoolId, user) => { assertAdmin(user); return repository.list(schoolId); };
const set = (schoolId, data, user) => { assertAdmin(user); return repository.set(schoolId, data); };
module.exports = { list, set };
