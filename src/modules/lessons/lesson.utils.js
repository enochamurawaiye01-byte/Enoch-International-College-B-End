const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"]);
const isAdmin = (role) => ADMIN_ROLES.has(role);
module.exports = { isAdmin };
