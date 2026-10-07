const service = require("./role.service");
const mailer = require("../../config/mailer");

const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.create(req.body, req.user.userId) }); } catch (error) { next(error); } };
const getAll = async (req, res, next) => { try { return res.json({ success: true, data: await service.getAll() }); } catch (error) { next(error); } };
const getById = async (req, res, next) => { try { return res.json({ success: true, data: await service.getById(req.params.id) }); } catch (error) { next(error); } };
const update = async (req, res, next) => { try { return res.json({ success: true, data: await service.update(req.params.id, req.body, req.user.userId) }); } catch (error) { next(error); } };
const remove = async (req, res, next) => { try { return res.json({ success: true, data: await service.remove(req.params.id, req.user.userId) }); } catch (error) { next(error); } };

const assign = async (req, res, next) => {
  try {
    const result = await service.assignRoles({ userId: req.body.userId, roleIds: req.body.roleId || req.body.roleIds, immediateActive: req.body.immediateActive }, req.user);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const activateRole = async (req, res, next) => {
  try {
    const result = await service.activateRole({ token: req.body.token, assignmentId: req.body.assignmentId }, req.user);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.body.userId;
    const result = await service.changeUserRoles(userId, { roles: req.body.role || req.body.roles, roleIds: req.body.roleIds }, req.user);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const testEmail = async (req, res, next) => {
  try {
    const recipient = process.env.MAILER_TEST_RECIPIENT || req.user.email;
    if (!recipient) return res.status(400).json({ success: false, message: "Configure a test recipient or provide an account email." });
    const sendResult = await mailer.sendApprovalEmail({
      to: recipient,
      name: "Klaviyo Diagnostic",
      username: recipient,
      role: "STUDENT",
      registrationNumber: "TEST",
      classOrProgramme: "Diagnostic test",
    });
    return res.json({ success: true, provider: "Klaviyo", sendResult });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, remove, assign, activateRole, changeUserRole, testEmail };
