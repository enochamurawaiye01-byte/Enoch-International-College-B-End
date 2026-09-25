const service = require("./report.service");

const getFinancialReport = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getFinancialReport(req.query) }); }
	catch (error) { next(error); }
};

const getAcademicReport = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getAcademicReport(req.query) }); }
	catch (error) { next(error); }
};

const getAttendanceReport = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getAttendanceReport(req.query) }); }
	catch (error) { next(error); }
};

const getExaminationReport = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getExaminationReport(req.query) }); }
	catch (error) { next(error); }
};

const getOperationalReport = async (req, res, next) => {
	try { return res.json({ success: true, data: await service.getOperationalReport(req.query) }); }
	catch (error) { next(error); }
};

module.exports = {
	getFinancialReport,
	getAcademicReport,
	getAttendanceReport,
	getExaminationReport,
	getOperationalReport,
};

