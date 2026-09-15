const service = require("./receipt.service");

const getById = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getById(req.params.id) }); }
	catch (error) { next(error); }
};

const getByPaymentId = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getByPaymentId(req.params.paymentId) }); }
	catch (error) { next(error); }
};

const getAll = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getAll(req.query) }); }
	catch (error) { next(error); }
};

const setStatus = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.setStatus(req.params.id, req.body.status) }); }
	catch (error) { next(error); }
};

module.exports = { getById, getByPaymentId, getAll, setStatus };
