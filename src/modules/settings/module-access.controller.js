const service = require("./module-access.service");
const set = async (req, res, next) => { try { return res.json({ success: true, data: await service.set(req.user.schoolId, req.body) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.user.schoolId) }); } catch (error) { next(error); } };
module.exports = { set, list };