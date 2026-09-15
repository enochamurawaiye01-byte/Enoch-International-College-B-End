const { prisma } = require("../../config/database");
const include = { organizer: { select: { id: true, fullName: true, role: true } } };
const findById = (id) => prisma.event.findUnique({ where: { id }, include });
const create = (data) => prisma.event.create({ data, include });
const update = (id, data) => prisma.event.update({ where: { id }, data, include });
const remove = (id) => prisma.event.delete({ where: { id } });
const findMany = (where, pagination) => prisma.event.findMany({ where, ...pagination, include, orderBy: { startDate: "asc" } });
const count = (where) => prisma.event.count({ where });
module.exports = { findById, create, update, remove, findMany, count };
