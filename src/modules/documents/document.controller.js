const service = require("./document.service");
const { uploadFile } = require("../../config/storage");
const create = async (req, res, next) => { try { const document = req.file ? await uploadFile({ file: req.file, folder: `students/${req.body.studentId}`, privateFile: true }) : null; const data = { ...req.body, ...(document ? { fileUrl: document.storageReference } : {}) }; return res.status(201).json({ success: true, data: await service.create(data, req.user) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.query, req.user) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id, req.user) }); } catch (error) { next(error); } };
const remove = async (req, res, next) => { try { return res.json({ success: true, data: await service.remove(req.params.id, req.user) }); } catch (error) { next(error); } };
module.exports = { create, list, getById, remove };
