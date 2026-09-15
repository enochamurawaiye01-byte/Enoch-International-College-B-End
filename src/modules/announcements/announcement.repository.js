const { prisma } = require("../../config/database");
const findById = (id) => prisma.announcement.findUnique({ where: { id } });
const findAll = (where) => prisma.announcement.findMany({ where, orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }] });
const create = (data) => prisma.announcement.create({ data });
const update = (id, data) => prisma.announcement.update({ where: { id }, data });
module.exports = { findById, findAll, create, update };
