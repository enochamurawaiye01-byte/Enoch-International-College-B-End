const { prisma } = require("../../config/database");

const accountInclude = {
	student: true,
	feeStructure: {
		include: { session: true, term: true, class: { include: { classLevel: true } } },
	},
	payments: { orderBy: { paymentDate: "desc" } },
};

const findStudent = (id) => prisma.student.findUnique({ where: { id } });
const findFeeStructure = (id) => prisma.feeStructure.findUnique({ where: { id } });
const findEnrollment = (studentId, sessionId, termId) => prisma.enrollment.findFirst({
	where: { studentId, sessionId, ...(termId ? { termId } : {}), status: "ACTIVE" },
});
const findAccount = (studentId, feeStructureId) => prisma.studentFeeAccount.findUnique({
	where: { studentId_feeStructureId: { studentId, feeStructureId } },
	include: accountInclude,
});
const findAccountById = (id) => prisma.studentFeeAccount.findUnique({ where: { id }, include: accountInclude });
const createAccount = (data) => prisma.studentFeeAccount.create({ data, include: accountInclude });
const findAccounts = (studentId) => prisma.studentFeeAccount.findMany({
	where: studentId ? { studentId } : undefined,
	include: accountInclude,
	orderBy: { createdAt: "desc" },
});
const updateAccount = (id, data) => prisma.studentFeeAccount.update({ where: { id }, data, include: accountInclude });

module.exports = {
	findStudent,
	findFeeStructure,
	findEnrollment,
	findAccount,
	findAccountById,
	createAccount,
	findAccounts,
	updateAccount,
};
