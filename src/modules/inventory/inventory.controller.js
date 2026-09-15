const service = require("./inventory.service");
const createItem = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createItem(req.body) }); } catch (error) { next(error); } };
const getItems = async (req, res, next) => { try { return res.json({ success: true, data: await service.getItems(req.query) }); } catch (error) { next(error); } };
const getItem = async (req, res, next) => { try { return res.json({ success: true, data: await service.getItem(req.params.id) }); } catch (error) { next(error); } };
const createMovement = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createMovement(req.body, req.user.userId) }); } catch (error) { next(error); } };
module.exports = { createItem, getItems, getItem, createMovement };
