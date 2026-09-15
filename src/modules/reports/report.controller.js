const service = require("./report.service");

const getFinancialReport = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getFinancialReport(req.query) }); }
	catch (error) { next(error); }
};

module.exports = { getFinancialReport };
