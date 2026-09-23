const service = require("./result.service");
const getMine = async (req, res, next) => { try { return res.json({ success: true, data: await service.getMyResults(req.user.userId) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.query) }); } catch (error) { next(error); } };
const getTeacher = async (req, res, next) => { try { return res.json({ success: true, data: await service.getForTeacher(req.user.userId, req.query) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const publish = async (req, res, next) => { try { return res.json({ success: true, data: await service.setPublished(req.params.id, req.body.published) }); } catch (error) { next(error); } };
module.exports = { getMine, getAll, getTeacher, getById, publish };
