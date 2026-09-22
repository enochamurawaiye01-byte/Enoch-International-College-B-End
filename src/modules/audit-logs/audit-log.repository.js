const { prisma } = require("../../config/database");
const findAll = (where, skip = 0, take = 25) => prisma.auditLog.findMany({ where, include: { user: { select: { id: true, fullName: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, skip, take });
const count = (where) => prisma.auditLog.count({ where });
module.exports = { findAll, count };
