const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./notification.repository");
const { isAdmin } = require("./notification.utils");
const create = async (data, user) => { if (!isAdmin(user.role)) throw new AppError("Only administrators can create system notifications.", 403, "NOTIFICATION_ACCESS_DENIED"); return repository.create(data); };
const list = (user) => repository.findAll({ userId: user.userId });
const markRead = async (id, user) => { const notification = await repository.findById(id); if (!notification) throw new NotFoundError("Notification not found"); if (notification.userId !== user.userId) throw new AppError("You can only update your own notifications.", 403, "NOTIFICATION_ACCESS_DENIED"); return repository.markRead(id); };
module.exports = { create, list, markRead };
