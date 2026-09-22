const { prisma } = require("../../config/database");
const create = (data) => prisma.notification.create({ data });
const findAll = (where) => prisma.notification.findMany({ where, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.notification.findUnique({ where: { id } });
const markRead = (id) => prisma.notification.update({ where: { id }, data: { status: "READ", readAt: new Date() } });
const countUnread = (userId) => prisma.notification.count({ where: { userId, status: "UNREAD" } });
const markAllRead = (userId) => prisma.notification.updateMany({ where: { userId, status: "UNREAD" }, data: { status: "READ", readAt: new Date() } });
module.exports = { create, findAll, findById, markRead, countUnread, markAllRead };
