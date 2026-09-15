const service = require("./medical.service");
const saveProfile = async (req, res, next) => { try { return res.json({ success: true, data: await service.saveProfile(req.body) }); } catch (error) { next(error); } };
const getProfile = async (req, res, next) => { try { return res.json({ success: true, data: await service.getProfile(req.params.studentId) }); } catch (error) { next(error); } };
const createVisit = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createVisit(req.body, req.user.userId) }); } catch (error) { next(error); } };
const getVisits = async (req, res, next) => { try { return res.json({ success: true, data: await service.getVisits(req.query.studentId) }); } catch (error) { next(error); } };
module.exports = { saveProfile, getProfile, createVisit, getVisits };
