const { prisma } = require("../../config/database");

const findPayments = (where) => prisma.payment.findMany({
	where,
	include: { student: { include: { currentClass: true } }, invoice: { include: { session: true, term: true } } },
	orderBy: { paymentDate: "asc" },
});

const findInvoices = (where) => prisma.invoice.findMany({
	where,
	include: { student: { include: { currentClass: true } }, session: true, term: true },
	orderBy: { createdAt: "asc" },
});

const findFeeAccounts = (where) => prisma.studentFeeAccount.findMany({
	where,
	include: { student: { include: { currentClass: true } }, feeStructure: { include: { session: true, term: true } } },
});

module.exports = { findPayments, findInvoices, findFeeAccounts };
