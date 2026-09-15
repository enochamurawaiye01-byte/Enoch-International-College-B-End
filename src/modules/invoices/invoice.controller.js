const service = require("./invoice.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.query) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body) }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, update };
