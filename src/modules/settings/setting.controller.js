const service = require("./setting.service");
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.user.schoolId, req.user) }); } catch (error) { next(error); } };
const set = async (req, res, next) => { try { return res.json({ success: true, data: await service.set(req.user.schoolId, req.body, req.user) }); } catch (error) { next(error); } };
module.exports = { list, set };
