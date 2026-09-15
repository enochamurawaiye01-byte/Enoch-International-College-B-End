const service = require("./user.service");
const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user) }); } catch (error) { next(error); } };
const list = async (req, res, next) => { try { return res.json({ success: true, data: await service.list(req.query, req.user) }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body, req.user) }); } catch (error) { next(error); } };
const changeRole = async (req, res, next) => { try { return res.json({ success: true, data: await service.changeRole(req.params.id, req.body.role, req.user) }); } catch (error) { next(error); } };
const changeStatus = async (req, res, next) => { try { return res.json({ success: true, data: await service.changeStatus(req.params.id, req.body.status, req.user) }); } catch (error) { next(error); } };
const resetPassword = async (req, res, next) => { try { return res.json({ success: true, data: await service.resetPassword(req.params.id, req.body.password, req.user) }); } catch (error) { next(error); } };
module.exports = { create, list, getById, update, changeRole, changeStatus, resetPassword };
