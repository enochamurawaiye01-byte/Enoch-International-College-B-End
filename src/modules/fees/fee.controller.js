const service = require("./fee.service");

const createFeeStructure = async (req, res, next) => {
	try {
		return res.status(201).json({ success: true, data: await service.createFeeStructure(req.body) });
	} catch (error) {
		next(error);
	}
};

const getAllFeeStructures = async (req, res, next) => {
	try {
		return res.json({ success: true, data: await service.getAllFeeStructures(req.query) });
	} catch (error) {
		next(error);
	}
};

const getFeeStructureById = async (req, res, next) => {
	try {
		return res.json({ success: true, data: await service.getFeeStructureById(req.params.id) });
	} catch (error) {
		next(error);
	}
};

const updateFeeStructure = async (req, res, next) => {
	try {
		return res.json({ success: true, data: await service.updateFeeStructure(req.params.id, req.body) });
	} catch (error) {
		next(error);
	}
};

const deleteFeeStructure = async (req, res, next) => {
	try {
		await service.deleteFeeStructure(req.params.id);
		return res.json({ success: true, message: "Fee structure deleted successfully" });
	} catch (error) {
		next(error);
	}
};

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

module.exports = {
	createFeeStructure,
	getAllFeeStructures,
	getFeeStructureById,
	updateFeeStructure,
	deleteFeeStructure,
	createAccount,
	getAccounts,
	getAccount,
	getStudentBalance,
};

