const service = require("./transport.service");
const createVehicle = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createVehicle(req.body) }); } catch (error) { next(error); } };
const getVehicles = async (req, res, next) => { try { return res.json({ success: true, data: await service.getVehicles() }); } catch (error) { next(error); } };
const createRoute = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createRoute(req.body) }); } catch (error) { next(error); } };
const getRoutes = async (req, res, next) => { try { return res.json({ success: true, data: await service.getRoutes() }); } catch (error) { next(error); } };
const createAssignment = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createAssignment(req.body) }); } catch (error) { next(error); } };
const getAssignments = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAssignments() }); } catch (error) { next(error); } };
module.exports = { createVehicle, getVehicles, createRoute, getRoutes, createAssignment, getAssignments };
