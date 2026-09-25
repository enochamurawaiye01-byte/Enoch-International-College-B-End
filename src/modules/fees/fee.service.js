const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./fee.repository");
const { FEE_ERRORS: ERRORS } = require("./fee.constants");

const toNumber = (value) => Number(value);

const createFeeStructure = async (data) => {
	if (!data.name || !data.sessionId || data.amount === undefined) {
		throw new AppError("Name, session ID, and amount are required for a fee structure.", 400, "MISSING_REQUIRED_FIELDS");
	}
	return repository.createFeeStructure({
		name: data.name,
		feeType: data.feeType || "TUITION",
		sessionId: data.sessionId,
		termId: data.termId || null,
		classId: data.classId || null,
		amount: toNumber(data.amount),
		description: data.description || null,
		isMandatory: data.isMandatory !== undefined ? Boolean(data.isMandatory) : true,
		isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
	});
};

const getAllFeeStructures = async (query = {}) => {
	const where = {};
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;
	if (query.classId) where.classId = query.classId;
	if (query.feeType) where.feeType = query.feeType;
	if (query.isActive !== undefined) where.isActive = query.isActive === "true";
	return repository.findAllFeeStructures(where);
};

const getFeeStructureById = async (id) => {
	const feeStructure = await repository.findFeeStructure(id);
	if (!feeStructure) throw new NotFoundError(ERRORS.FEE_STRUCTURE_NOT_FOUND);
	return feeStructure;
};

const updateFeeStructure = async (id, data) => {
	await getFeeStructureById(id);
	const updateData = {};
	if (data.name) updateData.name = data.name;
	if (data.feeType) updateData.feeType = data.feeType;
	if (data.amount !== undefined) updateData.amount = toNumber(data.amount);
	if (data.description !== undefined) updateData.description = data.description;
	if (data.isMandatory !== undefined) updateData.isMandatory = Boolean(data.isMandatory);
	if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
	return repository.updateFeeStructure(id, updateData);
};

const deleteFeeStructure = async (id) => {
	await getFeeStructureById(id);
	return repository.deleteFeeStructure(id);
};

const createFeeAccount = async ({ studentId, feeStructureId, dueDate }) => {
	const [student, feeStructure] = await Promise.all([
		repository.findStudent(studentId),
		repository.findFeeStructure(feeStructureId),
	]);

	if (!student) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND);
	if (!feeStructure) throw new NotFoundError(ERRORS.FEE_STRUCTURE_NOT_FOUND);
	if (!feeStructure.isActive) throw new AppError(ERRORS.FEE_STRUCTURE_INACTIVE, 409, "FEE_STRUCTURE_INACTIVE");

	const enrollment = await repository.findEnrollment(
		studentId,
		feeStructure.sessionId,
		feeStructure.termId
	);
	if (!enrollment) throw new AppError(ERRORS.STUDENT_NOT_ENROLLED, 409, "STUDENT_NOT_ENROLLED");

	if (await repository.findAccount(studentId, feeStructureId)) {
		throw new AppError(ERRORS.FEE_ACCOUNT_EXISTS, 409, "FEE_ACCOUNT_EXISTS");
	}

	const amountDue = toNumber(feeStructure.amount);
	return repository.createAccount({
		studentId,
		feeStructureId,
		amountDue,
		amountPaid: 0,
		balance: amountDue,
		status: "PENDING",
		dueDate: dueDate || null,
	});
};

const getAccounts = (studentId) => repository.findAccounts(studentId);

const getAccount = async (id) => {
	const account = await repository.findAccountById(id);
	if (!account) throw new NotFoundError(ERRORS.FEE_ACCOUNT_NOT_FOUND);
	return account;
};

const getStudentBalance = async (studentId) => {
	const student = await repository.findStudent(studentId);
	if (!student) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND);
	const accounts = await repository.findAccounts(studentId);
	return {
		studentId,
		totalDue: accounts.reduce((total, item) => total + toNumber(item.amountDue), 0),
		totalPaid: accounts.reduce((total, item) => total + toNumber(item.amountPaid), 0),
		outstandingBalance: accounts.reduce((total, item) => total + toNumber(item.balance), 0),
		accounts,
	};
};

const recalculateAccount = async (id, amountPaid) => {
	const account = await getAccount(id);
	const paid = toNumber(amountPaid);
	const due = toNumber(account.amountDue);
	if (paid < 0 || paid > due) throw new AppError(ERRORS.INVALID_AMOUNT, 400, "INVALID_AMOUNT");
	const balance = due - paid;
	const status = paid === 0 ? "PENDING" : balance === 0 ? "PAID" : "PARTIAL";
	return repository.updateAccount(id, { amountPaid: paid, balance, status });
};

module.exports = {
	createFeeStructure,
	getAllFeeStructures,
	getFeeStructureById,
	updateFeeStructure,
	deleteFeeStructure,
	createFeeAccount,
	getAccounts,
	getAccount,
	getStudentBalance,
	recalculateAccount,
};

