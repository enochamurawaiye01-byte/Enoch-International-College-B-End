const repository = require("./report.repository");
const { prisma } = require("../../config/database");

const number = (value) => Number(value || 0);

const buildDateFilter = (from, to, field) => {
	if (!from && !to) return {};
	return { [field]: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } };
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

const getAcademicReport = async (query) => {
	const where = {};
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;
	if (query.classId) where.classId = query.classId;

	const [reportCards, enrollments] = await Promise.all([
		prisma.reportCard.findMany({
			where,
			include: { student: { include: { currentClass: true } }, entries: { include: { subject: true } } },
		}),
		prisma.enrollment.count({ where: { status: "ACTIVE", ...(query.classId ? { classId: query.classId } : {}) } }),
	]);

	const totalStudents = reportCards.length || 1;
	const avgScore = reportCards.reduce((acc, r) => acc + number(r.average), 0) / totalStudents;

	return {
		filters: query,
		summary: {
			totalEnrolledStudents: enrollments,
			reportCardsGenerated: reportCards.length,
			averagePerformancePercent: Math.round(avgScore * 100) / 100,
		},
		reportCards,
	};
};

const getAttendanceReport = async (query) => {
	const dateFilter = buildDateFilter(query.from, query.to, "date");
	const where = { ...dateFilter };
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;

	const attendanceRecords = await prisma.studentAttendance.findMany({
		where,
		include: { student: { include: { currentClass: true } } },
	});

	const filtered = query.classId ? attendanceRecords.filter((r) => r.student.currentClassId === query.classId) : attendanceRecords;

	const presentCount = filtered.filter((r) => r.status === "PRESENT").length;
	const absentCount = filtered.filter((r) => r.status === "ABSENT").length;
	const lateCount = filtered.filter((r) => r.status === "LATE").length;
	const total = filtered.length || 1;

	return {
		filters: query,
		summary: {
			totalRecords: filtered.length,
			presentCount,
			absentCount,
			lateCount,
			attendanceRatePercent: Math.round((presentCount / total) * 10000) / 100,
		},
		records: filtered,
	};
};

const getExaminationReport = async (query) => {
	const where = {};
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;

	const exams = await prisma.exam.findMany({
		where,
		include: { class: true, subject: true, results: true },
	});

	const filtered = query.classId ? exams.filter((e) => e.classId === query.classId) : exams;

	let totalPassed = 0;
	let totalFailed = 0;
	let totalAttempts = 0;

	filtered.forEach((e) => {
		e.results.forEach((r) => {
			totalAttempts += 1;
			if (r.status === "PASS") totalPassed += 1;
			else totalFailed += 1;
		});
	});

	return {
		filters: query,
		summary: {
			totalExams: filtered.length,
			totalAttempts,
			totalPassed,
			totalFailed,
			overallPassRatePercent: totalAttempts ? Math.round((totalPassed / totalAttempts) * 10000) / 100 : 0,
		},
		exams: filtered,
	};
};

const getOperationalReport = async (query) => {
	const [activeStudents, activeStaff, totalClasses, totalSubjects, activeInventoryItems] = await Promise.all([
		prisma.student.count({ where: { status: "ACTIVE" } }),
		prisma.staff.count({ where: { status: "ACTIVE" } }),
		prisma.class.count({ where: { isActive: true } }),
		prisma.subject.count({ where: { isActive: true } }),
		prisma.inventoryItem.count({ where: { isActive: true } }),
	]);

	return {
		summary: {
			activeStudents,
			activeStaff,
			totalClasses,
			totalSubjects,
			activeInventoryItems,
			generatedAt: new Date().toISOString(),
		},
	};
};

module.exports = {
	getFinancialReport,
	getAcademicReport,
	getAttendanceReport,
	getExaminationReport,
	getOperationalReport,
};

