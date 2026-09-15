const service = require("./payment.service");

const create = async (req, res, next) => {
	try { return res.status(201).json({ success: true, data: await service.create(req.body) }); }
	catch (error) { next(error); }
};

const getAll = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getAll(req.query) }); }
	catch (error) { next(error); }
};

const getById = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getById(req.params.id) }); }
	catch (error) { next(error); }
};

const verify = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.verify(req.params.id, req.body.status) }); }
	catch (error) { next(error); }
};

const initializePaystack = async (req, res, next) => {
	try { return res.status(201).json({ success: true, data: await service.initializePaystack(req.body, req.user) }); }
	catch (error) { next(error); }
};

const paystackWebhook = async (req, res, next) => {
	try {
		const crypto = require("crypto");
		const signature = req.headers["x-paystack-signature"];
		const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "").update(req.rawBody || JSON.stringify(req.body)).digest("hex");
		const validSignature = signature && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
		if (!validSignature) return res.status(401).json({ success: false, message: "Invalid Paystack signature." });
		return res.json({ success: true, data: await service.handlePaystackWebhook(req.body) });
	} catch (error) { next(error); }
};

module.exports = { create, getAll, getById, verify, initializePaystack, paystackWebhook };
