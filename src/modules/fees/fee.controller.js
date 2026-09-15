const service = require("./fee.service");

const createAccount = async (req, res, next) => {
	try {
		return res.status(201).json({
			success: true,
			data: await service.createFeeAccount(req.body),
		});
	} catch (error) {
		next(error);
	}
};

const getAccounts = async (req, res, next) => {
	try {
		return res.json({ success: true, data: await service.getAccounts(req.query.studentId) });
	} catch (error) {
		next(error);
	}
};

const getAccount = async (req, res, next) => {
	try {
		return res.json({ success: true, data: await service.getAccount(req.params.id) });
	} catch (error) {
		next(error);
	}
};

const getStudentBalance = async (req, res, next) => {
	try {
		return res.json({ success: true, data: await service.getStudentBalance(req.params.studentId) });
	} catch (error) {
		next(error);
	}
};

module.exports = { createAccount, getAccounts, getAccount, getStudentBalance };
