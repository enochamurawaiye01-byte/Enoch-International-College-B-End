const service = require("./transcript.service");
const download = async (req, res, next) => { try { const csv = await service.getCsv(req.query); res.attachment("student-transcripts.csv").type("text/csv").send(csv); } catch (error) { next(error); } };
module.exports = { download };