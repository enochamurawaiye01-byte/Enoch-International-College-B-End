const service = require("./attendance.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.query, req.user) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id, req.user) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body, req.user) }); } catch (error) { next(error); } };
const summary = async (req, res, next) => { try { return res.json({ success: true, data: await service.summary(req.query, req.user) }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, update, summary };
