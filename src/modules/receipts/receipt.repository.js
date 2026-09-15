const { prisma } = require("../../config/database");

const include = {
	payment: {
		include: {
			student: true,
			invoice: { include: { items: true } },
			feeAccount: { include: { feeStructure: true } },
		},
	},
};

const findById = (id) => prisma.receipt.findUnique({ where: { id }, include });
const findByPaymentId = (paymentId) => prisma.receipt.findUnique({ where: { paymentId }, include });
const findAll = (where) => prisma.receipt.findMany({ where, include, orderBy: { issuedAt: "desc" } });
const update = (id, data) => prisma.receipt.update({ where: { id }, data, include });

module.exports = { findById, findByPaymentId, findAll, update };
