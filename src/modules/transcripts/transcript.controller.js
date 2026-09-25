const service = require("./transcript.service");

const download = async (req, res, next) => {
	try {
		const csv = await service.getCsv(req.query);
		res.attachment("student-transcripts.csv").type("text/csv").send(csv);
	} catch (error) {
		next(error);
	}
};

const getStudentTranscript = async (req, res, next) => {
	try {
		const data = await service.getStudentTranscript(req.params.studentId);
		return res.status(200).json({ success: true, data });
	} catch (error) {
		next(error);
	}
};

module.exports = { download, getStudentTranscript };