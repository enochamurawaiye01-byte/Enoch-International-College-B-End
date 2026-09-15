const isAdmin = (role) => ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(role);
module.exports = { isAdmin };
