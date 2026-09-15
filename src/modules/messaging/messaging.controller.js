const service = require("./messaging.service");
const send = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.send(req.body, req.user) }); } catch (error) { next(error); } };
const inbox = async (req, res, next) => { try { return res.json({ success: true, data: await service.inbox(req.user) }); } catch (error) { next(error); } };
const sent = async (req, res, next) => { try { return res.json({ success: true, data: await service.sent(req.user) }); } catch (error) { next(error); } };
const markRead = async (req, res, next) => { try { return res.json({ success: true, data: await service.markRead(req.params.id, req.user) }); } catch (error) { next(error); } };
module.exports = { send, inbox, sent, markRead };
