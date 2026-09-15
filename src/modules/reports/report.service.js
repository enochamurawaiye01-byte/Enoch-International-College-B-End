const repository = require("./report.repository");

const number = (value) => Number(value || 0);

const buildDateFilter = (from, to, field) => {
	if (!from && !to) return {};
	return { [field]: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
};

const getFinancialReport = async (query) => {
	const paymentDate = buildDateFilter(query.from, query.to, "paymentDate");
	const invoiceDate = buildDateFilter(query.from, query.to, "createdAt");
	const paymentWhere = { status: "PAID", ...paymentDate };
	if (query.studentId) paymentWhere.studentId = query.studentId;
	if (query.method) paymentWhere.method = query.method;
	if (query.sessionId || query.termId) paymentWhere.invoice = { ...(query.sessionId ? { sessionId: query.sessionId } : {}), ...(query.termId ? { termId: query.termId } : {}) };

	const invoiceWhere = { ...invoiceDate };
	if (query.studentId) invoiceWhere.studentId = query.studentId;
	if (query.sessionId) invoiceWhere.sessionId = query.sessionId;
	if (query.termId) invoiceWhere.termId = query.termId;

	const accountWhere = {};
	if (query.studentId) accountWhere.studentId = query.studentId;
	if (query.sessionId || query.termId) accountWhere.feeStructure = { ...(query.sessionId ? { sessionId: query.sessionId } : {}), ...(query.termId ? { termId: query.termId } : {}) };

	const [payments, invoices, accounts] = await Promise.all([
		repository.findPayments(paymentWhere),
		repository.findInvoices(invoiceWhere),
		repository.findFeeAccounts(accountWhere),
	]);

	const filteredPayments = query.classId ? payments.filter((payment) => payment.student.currentClassId === query.classId) : payments;
	const filteredInvoices = query.classId ? invoices.filter((invoice) => invoice.student.currentClassId === query.classId) : invoices;
	const filteredAccounts = query.classId ? accounts.filter((account) => account.student.currentClassId === query.classId) : accounts;
	const byMethod = {};
	for (const payment of filteredPayments) byMethod[payment.method] = (byMethod[payment.method] || 0) + number(payment.amount);

	return {
		filters: query,
		summary: {
			totalRevenue: filteredPayments.reduce((total, payment) => total + number(payment.amount), 0),
			totalPayments: filteredPayments.length,
			outstandingFees: filteredAccounts.reduce((total, account) => total + number(account.balance), 0),
			paidInvoices: filteredInvoices.filter((invoice) => invoice.status === "PAID").length,
			unpaidInvoices: filteredInvoices.filter((invoice) => ["DRAFT", "ISSUED", "OVERDUE"].includes(invoice.status)).length,
			partiallyPaidInvoices: filteredInvoices.filter((invoice) => invoice.status === "PARTIALLY_PAID").length,
		},
		paymentMethods: byMethod,
		payments: filteredPayments,
		invoices: filteredInvoices,
		feeAccounts: filteredAccounts,
	};
};

module.exports = { getFinancialReport };
