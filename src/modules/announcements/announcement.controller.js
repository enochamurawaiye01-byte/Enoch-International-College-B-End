const service = require("./announcement.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.query, req.user) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body, req.user) }); } catch (error) { next(error); } };
const publish = async (req, res, next) => { try { return res.json({ success: true, data: await service.publish(req.params.id, req.body.published, req.user) }); } catch (error) { next(error); } };
module.exports = { create, list, getById, update, publish };
