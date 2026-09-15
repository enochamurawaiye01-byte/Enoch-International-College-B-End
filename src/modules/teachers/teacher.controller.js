const service = require("./teacher.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user.schoolId) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll() }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const getCurrent = async (req, res, next) => { try { return res.json({ success: true, data: await service.getCurrent(req.user.userId) }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, getCurrent };
