const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"]);
const isAdmin = (role) => ADMIN_ROLES.has(role);
const audienceFor = (role) => ({ STUDENT: "STUDENTS", TEACHER: "TEACHERS", PARENT: "PARENTS", STAFF: "STAFF", MANAGEMENT: "MANAGEMENT" }[role] || "ADMINS");
module.exports = { isAdmin, audienceFor };
