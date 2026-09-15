const service = require("./notification.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.user) }); } catch (error) { next(error); } };
const markRead = async (req, res, next) => { try { return res.json({ success: true, data: await service.markRead(req.params.id, req.user) }); } catch (error) { next(error); } };
module.exports = { create, list, markRead };
