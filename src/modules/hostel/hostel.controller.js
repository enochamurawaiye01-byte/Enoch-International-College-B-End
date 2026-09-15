const service = require("./hostel.service");
const createHostel = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createHostel(req.body) }); } catch (error) { next(error); } };
const getHostels = async (req, res, next) => { try { return res.json({ success: true, data: await service.getHostels() }); } catch (error) { next(error); } };
const createRoom = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createRoom(req.body) }); } catch (error) { next(error); } };
const createBed = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createBed(req.body) }); } catch (error) { next(error); } };
const allocate = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.allocate(req.body) }); } catch (error) { next(error); } };
const checkout = async (req, res, next) => { try { return res.json({ success: true, data: await service.checkout(req.params.id, req.body) }); } catch (error) { next(error); } };
module.exports = { createHostel, getHostels, createRoom, createBed, allocate, checkout };
