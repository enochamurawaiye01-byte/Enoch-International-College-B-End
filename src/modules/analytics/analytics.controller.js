const service = require("./analytics.service");
const dashboard = async (req, res, next) => { try { return res.json({ success: true, data: await service.getDashboard(req.user, req.query) }); } catch (error) { next(error); } };
module.exports = { dashboard };
