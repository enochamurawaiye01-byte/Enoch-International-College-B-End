const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./receipt.repository");
const { RECEIPT_ERRORS: ERRORS } = require("./receipt.constants");

const getById = async (id) => {
	const receipt = await repository.findById(id);
	if (!receipt) throw new NotFoundError(ERRORS.RECEIPT_NOT_FOUND);
	return receipt;
};

const getByPaymentId = async (paymentId) => {
	const receipt = await repository.findByPaymentId(paymentId);
	if (!receipt) throw new NotFoundError(ERRORS.RECEIPT_NOT_FOUND);
	return receipt;
};

const getAll = (query) => {
	const where = query.status ? { status: query.status } : undefined;
	return repository.findAll(where);
};

const setStatus = async (id, status) => {
	await getById(id);
	return repository.update(id, { status });
};

module.exports = { getById, getByPaymentId, getAll, setStatus };
