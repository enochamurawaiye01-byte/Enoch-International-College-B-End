const service = require("./teacher-assignment.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.query) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const remove = async (req, res, next) => { try { await service.remove(req.params.id); return res.json({ success: true, message: "Teacher assignment removed successfully." }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, remove };