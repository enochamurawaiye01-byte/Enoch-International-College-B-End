const { prisma } = require("../../config/database");

const include = {
	student: true,
	invoice: { include: { items: true } },
	feeAccount: { include: { feeStructure: true } },
	receipt: true,
};

const findStudent = (id) => prisma.student.findUnique({ where: { id }, include: { user: true } });
const findStudentByUserId = (userId) => prisma.student.findUnique({ where: { userId }, select: { id: true } });
const findInvoice = (id) => prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
const findFeeAccount = (id) => prisma.studentFeeAccount.findUnique({ where: { id, }, include: { payments: true } });
const findById = (id) => prisma.payment.findUnique({ where: { id }, include });
const findByReference = (transactionReference) => prisma.payment.findUnique({ where: { transactionReference }, include });
const findAll = (where) => prisma.payment.findMany({ where, include, orderBy: { paymentDate: "desc" } });

const createPending = (data) => prisma.payment.create({ data, include });

const verify = (id, status) => prisma.$transaction(async (tx) => {
	const payment = await tx.payment.findUnique({
		where: { id },
		include: { invoice: true, feeAccount: true },
	});
	if (!payment) return null;

	const updatedPayment = await tx.payment.update({
		where: { id },
		data: { status },
		include,
	});

	if (status === "PAID") {
		if (payment.invoiceId && payment.invoice) {
			const amountPaid = Number(payment.invoice.amountPaid) + Number(payment.amount);
			const balance = Math.max(0, Number(payment.invoice.amount) - amountPaid);
			await tx.invoice.update({
				where: { id: payment.invoiceId },
				data: {
					amountPaid,
					balance,
					status: balance === 0 ? "PAID" : "PARTIALLY_PAID",
				},
			});
		}

		if (payment.feeAccountId && payment.feeAccount) {
			const amountPaid = Number(payment.feeAccount.amountPaid) + Number(payment.amount);
			const balance = Math.max(0, Number(payment.feeAccount.amountDue) - amountPaid);
			await tx.studentFeeAccount.update({
				where: { id: payment.feeAccountId },
				data: {
					amountPaid,
					balance,
					status: balance === 0 ? "PAID" : "PARTIAL",
				},
			});
		}

		await tx.receipt.upsert({
			where: { paymentId: id },
			update: { receiptNumber: payment.receiptNumber },
			create: { paymentId: id, receiptNumber: payment.receiptNumber },
		});
	}

	return updatedPayment;
});

module.exports = {
	findStudent,
	findStudentByUserId,
	findInvoice,
	findFeeAccount,
	findById,
	findByReference,
	findAll,
	createPending,
	verify,
};
