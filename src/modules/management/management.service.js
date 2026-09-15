const AppError = require("../../core/errors/AppError");
const repository = require("./management.repository");
const getDashboard = async (user) => { if (!["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(user.role)) throw new AppError("Management access required.", 403, "MANAGEMENT_ACCESS_DENIED"); return repository.dashboard(); };
module.exports = { getDashboard };
