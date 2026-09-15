const { prisma } = require("../../config/database");
const findUser = (id) => prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true, role: true, status: true } });
const create = (data) => prisma.message.create({ data, include: { sender: { select: { id: true, fullName: true, role: true } }, receiver: { select: { id: true, fullName: true, role: true } } } });
const findInbox = (userId) => prisma.message.findMany({ where: { receiverId: userId }, include: { sender: { select: { id: true, fullName: true, role: true } } }, orderBy: { createdAt: "desc" } });
const findSent = (userId) => prisma.message.findMany({ where: { senderId: userId }, include: { receiver: { select: { id: true, fullName: true, role: true } } }, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.message.findUnique({ where: { id } });
const markRead = (id) => prisma.message.update({ where: { id }, data: { status: "READ", readAt: new Date() } });
module.exports = { findUser, create, findInbox, findSent, findById, markRead };
