const { prisma } = require("../../config/database");
const create = (data) => prisma.notification.create({ data });
const findAll = (where) => prisma.notification.findMany({ where, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.notification.findUnique({ where: { id } });
const markRead = (id) => prisma.notification.update({ where: { id }, data: { status: "READ", readAt: new Date() } });
module.exports = { create, findAll, findById, markRead };
