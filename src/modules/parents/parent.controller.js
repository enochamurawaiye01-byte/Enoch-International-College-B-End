const service = require("./parent.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user.schoolId) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll() }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const linkStudent = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.linkStudent(req.params.id, req.body) }); } catch (error) { next(error); } };
const unlinkStudent = async (req, res, next) => { try { await service.unlinkStudent(req.params.id, req.params.studentId); return res.json({ success: true, message: "Student unlinked successfully." }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, linkStudent, unlinkStudent };
