const isAdmin = (role) => ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"].includes(role);
const pagination = (query) => ({ skip: (query.page - 1) * query.limit, take: query.limit });
module.exports = { isAdmin, pagination };
