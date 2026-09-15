const service = require("./management.service");
const dashboard = async (req, res, next) => { try { return res.json({ success: true, data: await service.getDashboard(req.user) }); } catch (error) { next(error); } };
module.exports = { dashboard };
