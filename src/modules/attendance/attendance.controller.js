const service = require("./attendance.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user) }); } catch (error) { next(error); } };
const batchCreate = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.batchCreate(req.body, req.user) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.validatedAttendanceQuery || req.query, req.user) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id, req.user) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body, req.user) }); } catch (error) { next(error); } };
const summary = async (req, res, next) => { try { return res.json({ success: true, data: await service.summary(req.validatedAttendanceQuery || req.query, req.user) }); } catch (error) { next(error); } };
module.exports = { create, batchCreate, getAll, getById, update, summary };
