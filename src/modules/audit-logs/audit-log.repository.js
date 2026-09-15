const { prisma } = require("../../config/database");
const findAll = (where) => prisma.auditLog.findMany({ where, include: { user: { select: { id: true, fullName: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
module.exports = { findAll };
