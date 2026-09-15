const service = require("./audit-log.service");
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.query) }); } catch (error) { next(error); } };
module.exports = { list };
