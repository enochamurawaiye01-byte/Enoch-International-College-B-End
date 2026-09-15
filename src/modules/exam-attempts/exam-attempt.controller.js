const service = require("./exam-attempt.service");
const start = async (req, res, next) => { try { return res.json({ success: true, data: await service.start(req.user.userId, req.body.examId) }); } catch (error) { next(error); } };
const submit = async (req, res, next) => { try { return res.json({ success: true, data: await service.submit(req.user.userId, req.params.id, req.body.answers) }); } catch (error) { next(error); } };
module.exports = { start, submit };
