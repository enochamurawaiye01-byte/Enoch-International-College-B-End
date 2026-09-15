const service = require("./discipline.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user.userId) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.query) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const resolve = async (req, res, next) => { try { return res.json({ success: true, data: await service.resolve(req.params.id, req.body) }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, resolve };
