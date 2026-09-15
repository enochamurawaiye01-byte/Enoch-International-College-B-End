const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./invoice.repository");
const { INVOICE_ERRORS: ERRORS } = require("./invoice.constants");

const makeInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const create = async (data) => {
	if (!await repository.findStudent(data.studentId)) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND);
	if (data.feeAccountId) {
		const account = await repository.findFeeAccount(data.feeAccountId);
		if (!account) throw new NotFoundError(ERRORS.FEE_ACCOUNT_NOT_FOUND);
		if (account.studentId !== data.studentId) throw new AppError("Fee account does not belong to student.", 409, "FEE_ACCOUNT_MISMATCH");
	}
	const items = data.items.map((item) => ({ ...item, amount: item.quantity * item.unitAmount }));
	const subtotal = items.reduce((total, item) => total + item.amount, 0);
	if (data.discount > subtotal) throw new AppError("Discount cannot exceed subtotal.", 400, "INVALID_DISCOUNT");
	const amount = subtotal - (data.discount || 0);
	return repository.create({
		invoiceNumber: makeInvoiceNumber(), studentId: data.studentId, sessionId: data.sessionId || null,
		termId: data.termId || null, feeAccountId: data.feeAccountId || null, subtotal, discount: data.discount || 0,
		amount, amountPaid: 0, balance: amount, status: "DRAFT", dueDate: data.dueDate || null,
		description: data.description || null, items: { create: items },
	});
};

const getAll = (query) => { const where = {}; ["studentId", "sessionId", "termId", "status"].forEach((key) => { if (query[key]) where[key] = query[key]; }); return repository.findAll(where); };
const getById = async (id) => { const invoice = await repository.findById(id); if (!invoice) throw new NotFoundError(ERRORS.INVOICE_NOT_FOUND); return invoice; };
const update = async (id, data) => {
	const invoice = await getById(id);
	if (invoice.status !== "DRAFT") throw new AppError(ERRORS.INVOICE_LOCKED, 409, "INVOICE_LOCKED");
	if (data.status && !["DRAFT", "ISSUED", "CANCELLED"].includes(data.status)) throw new AppError(ERRORS.INVALID_STATUS_CHANGE, 400, "INVALID_STATUS_CHANGE");
	return repository.update(id, data);
};
module.exports = { create, getAll, getById, update };
