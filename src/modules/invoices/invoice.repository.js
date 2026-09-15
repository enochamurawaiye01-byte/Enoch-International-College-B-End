const { prisma } = require("../../config/database");
const include = { student: true, session: true, term: true, feeAccount: true, items: true, payments: true };
const findStudent = (id) => prisma.student.findUnique({ where: { id } });
const findFeeAccount = (id) => prisma.studentFeeAccount.findUnique({ where: { id }, include: { feeStructure: true } });
const create = (data) => prisma.invoice.create({ data, include });
const findAll = (where) => prisma.invoice.findMany({ where, include, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.invoice.findUnique({ where: { id }, include });
const update = (id, data) => prisma.invoice.update({ where: { id }, data, include });
module.exports = { findStudent, findFeeAccount, create, findAll, findById, update };
