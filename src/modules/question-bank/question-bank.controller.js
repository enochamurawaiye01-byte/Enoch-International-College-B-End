const service = require("./question-bank.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll(req.query.examId) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { const canSeeAnswers = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(req.user.role); return res.json({ success: true, data: await service.getById(req.params.id, canSeeAnswers) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body) }); } catch (error) { next(error); } };
const remove = async (req, res, next) => { try { await service.remove(req.params.id); return res.json({ success: true, message: "Question deleted successfully." }); } catch (error) { next(error); } };
module.exports = { create, getAll, getById, update, remove };
