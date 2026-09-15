const service = require("./assignment.service");
const wrap = (action, status = 200) => async (req, res, next) => { try { return res.status(status).json({ success: true, data: await action(req) }); } catch (error) { next(error); } };
const create = wrap((req) => service.create(req.body, req.user), 201);
const update = wrap((req) => service.update(req.params.id, req.body, req.user));
const getAll = wrap((req) => service.getAll(req.query, req.user));
const getById = wrap((req) => service.getById(req.params.id));
const submit = wrap((req) => service.submit(req.params.id, req.body, req.user), 201);
const grade = wrap((req) => service.grade(req.params.submissionId, req.body, req.user));
module.exports = { create, update, getAll, getById, submit, grade };
