const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./payment.repository");
const { PAYMENT_ERRORS: ERRORS } = require("./payment.constants");

const makeReceiptNumber = () => `RCT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
const makePaystackReference = () => `EIC-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

const create = async (data) => {
	const student = await repository.findStudent(data.studentId);
	if (!student) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND);

	if (data.invoiceId) {
		const invoice = await repository.findInvoice(data.invoiceId);
		if (!invoice) throw new NotFoundError(ERRORS.INVOICE_NOT_FOUND);
		if (invoice.studentId !== data.studentId) throw new AppError("Invoice does not belong to student.", 409, "INVOICE_STUDENT_MISMATCH");
		if (Number(data.amount) > Number(invoice.amount) - Number(invoice.amountPaid)) throw new AppError(ERRORS.INVALID_PAYMENT_AMOUNT, 400, "INVALID_PAYMENT_AMOUNT");
	}

	if (data.feeAccountId) {
		const account = await repository.findFeeAccount(data.feeAccountId);
		if (!account) throw new NotFoundError(ERRORS.FEE_ACCOUNT_NOT_FOUND);
		if (account.studentId !== data.studentId) throw new AppError("Fee account does not belong to student.", 409, "FEE_ACCOUNT_STUDENT_MISMATCH");
		if (Number(data.amount) > Number(account.amountDue) - Number(account.amountPaid)) throw new AppError(ERRORS.INVALID_PAYMENT_AMOUNT, 400, "INVALID_PAYMENT_AMOUNT");
	}

	if (data.transactionReference && await repository.findByReference(data.transactionReference)) {
		throw new AppError(ERRORS.PAYMENT_REFERENCE_EXISTS, 409, "PAYMENT_REFERENCE_EXISTS");
	}

	return repository.createPending({
		studentId: data.studentId,
		invoiceId: data.invoiceId || null,
		feeAccountId: data.feeAccountId || null,
		amount: data.amount,
		method: data.method,
		status: "PENDING",
		transactionReference: data.transactionReference || null,
		paymentDate: data.paymentDate || new Date(),
		notes: data.notes || null,
		receiptNumber: makeReceiptNumber(),
	});
};

const getById = async (id) => {
	const payment = await repository.findById(id);
	if (!payment) throw new NotFoundError(ERRORS.PAYMENT_NOT_FOUND);
	return payment;
};

const getAll = (query) => {
	const where = {};
	["studentId", "invoiceId", "feeAccountId", "status", "method"].forEach((key) => {
		if (query[key]) where[key] = query[key];
	});
	return repository.findAll(where);
};

const verify = async (id, status) => {
	const payment = await getById(id);
	if (payment.status !== "PENDING") throw new AppError(ERRORS.PAYMENT_ALREADY_VERIFIED, 409, "PAYMENT_ALREADY_VERIFIED");
	return repository.verify(id, status);
};

const initializePaystack = async (data, actor) => {
	if (!process.env.PAYSTACK_SECRET_KEY) throw new AppError("Paystack is not configured.", 503, "PAYSTACK_NOT_CONFIGURED");
	if (actor?.role === "STUDENT") {
		const ownStudent = await repository.findStudentByUserId(actor.userId);
		if (!ownStudent || ownStudent.id !== data.studentId) throw new AppError("Students can only pay their own fees.", 403, "PAYMENT_OWNER_REQUIRED");
	}
	const student = await repository.findStudent(data.studentId);
	if (!student) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND);
	let amount = Number(data.amount || 0);
	if (data.invoiceId) {
		const invoice = await repository.findInvoice(data.invoiceId);
		if (!invoice) throw new NotFoundError(ERRORS.INVOICE_NOT_FOUND);
		if (invoice.studentId !== data.studentId) throw new AppError("Invoice does not belong to student.", 409, "INVOICE_STUDENT_MISMATCH");
		amount = amount || Number(invoice.amount) - Number(invoice.amountPaid);
	}
	if (data.feeAccountId) {
		const account = await repository.findFeeAccount(data.feeAccountId);
		if (!account) throw new NotFoundError(ERRORS.FEE_ACCOUNT_NOT_FOUND);
		if (account.studentId !== data.studentId) throw new AppError("Fee account does not belong to student.", 409, "FEE_ACCOUNT_STUDENT_MISMATCH");
		amount = amount || Number(account.amountDue) - Number(account.amountPaid);
	}
	if (amount <= 0) throw new AppError(ERRORS.INVALID_PAYMENT_AMOUNT, 400, "INVALID_PAYMENT_AMOUNT");
	const reference = makePaystackReference();
	const payment = await repository.createPending({ studentId: data.studentId, invoiceId: data.invoiceId || null, feeAccountId: data.feeAccountId || null, amount, method: "ONLINE", status: "PENDING", transactionReference: reference, receiptNumber: makeReceiptNumber(), notes: "Paystack payment" });
	const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: student.user?.email, amount: Math.round(amount * 100), reference, callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined, metadata: { paymentId: payment.id, studentId: data.studentId, invoiceId: data.invoiceId || null, feeAccountId: data.feeAccountId || null } }) });
	const result = await response.json();
	if (!response.ok || !result.status) throw new AppError(result.message || "Paystack checkout initialization failed.", 502, "PAYSTACK_INITIALIZATION_FAILED");
	return { paymentId: payment.id, reference, authorizationUrl: result.data.authorization_url, accessCode: result.data.access_code };
};

const handlePaystackWebhook = async (payload) => {
	if (payload.event !== "charge.success") return { ignored: true };
	const reference = payload.data?.reference;
	const payment = reference && await repository.findByReference(reference);
	if (!payment) throw new NotFoundError(ERRORS.PAYMENT_NOT_FOUND);
	if (Number(payload.data.amount) !== Math.round(Number(payment.amount) * 100)) throw new AppError("Paystack amount does not match payment amount.", 400, "PAYSTACK_AMOUNT_MISMATCH");
	if (payment.status === "PAID") return payment;
	return repository.verify(payment.id, "PAID");
};

module.exports = { create, getById, getAll, verify, initializePaystack, handlePaystackWebhook };
