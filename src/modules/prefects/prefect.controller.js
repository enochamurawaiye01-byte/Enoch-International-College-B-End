const service = require("./prefect.service");
const createPosition = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createPosition(req.body, req.user.userId) }); } catch (error) { next(error); } };
const listPositions = async (req, res, next) => { try { return res.json({ success: true, data: await service.listPositions() }); } catch (error) { next(error); } };
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createAssignment(req.body, req.user.userId) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.listAssignments(req.query) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAssignment(req.params.id) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.updateAssignment(req.params.id, req.body, req.user.userId) }); } catch (error) { next(error); } };
module.exports = { createPosition, listPositions, create, list, getById, update };
