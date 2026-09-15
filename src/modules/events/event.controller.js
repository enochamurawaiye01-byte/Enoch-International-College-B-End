const service = require("./event.service");
const { uploadFile } = require("../../config/storage");
const create = async (req, res, next) => { try { const media = req.file ? await uploadFile({ file: req.file, folder: "events" }) : null; const data = { ...req.body, ...(media ? { imageUrl: media.url } : {}) }; return res.status(201).json({ success: true, data: await service.create(data, req.user) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.query) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { const item = await service.getById(req.params.id); if (!req.user && item.status !== "PUBLISHED") return res.status(404).json({ success: false, message: "Event not found" }); return res.json({ success: true, data: item }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body, req.user) }); } catch (error) { next(error); } };
const publish = async (req, res, next) => { try { return res.json({ success: true, data: await service.publish(req.params.id, req.body.published, req.user) }); } catch (error) { next(error); } };
const remove = async (req, res, next) => { try { return res.json({ success: true, data: await service.remove(req.params.id, req.user) }); } catch (error) { next(error); } };
module.exports = { create, list, getById, update, publish, remove };
