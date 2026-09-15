const AppError = require("../../core/errors/AppError");
const repository = require("./analytics.repository");
const getDashboard = async (user, query) => { if (!["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(user.role)) throw new AppError("Analytics access required.", 403, "ANALYTICS_ACCESS_DENIED"); const normalized = { ...query, ...(query.from ? { from: new Date(query.from) } : {}), ...(query.to ? { to: new Date(query.to) } : {}) }; return repository.dashboard(normalized); };
module.exports = { getDashboard };
