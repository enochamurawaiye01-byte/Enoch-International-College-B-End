const isAdmin = (role) => ["SUPER_ADMIN", "ADMIN"].includes(role);
module.exports = { isAdmin };
