const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./notification.repository");
const { isAdmin } = require("./notification.utils");
const create = async (data, user) => { if (!isAdmin(user.role)) throw new AppError("Only administrators can create system notifications.", 403, "NOTIFICATION_ACCESS_DENIED"); return repository.create(data); };
const targetPath = (notification, user) => {
	const text = `${notification.title} ${notification.message}`.toLowerCase();
	if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
		if (text.includes("application") || text.includes("applicant")) return "/pages/admin/applicants.html";
		if (text.includes("academic session") || text.includes("term")) return "/pages/admin/academic-sessions.html";
		if (text.includes("audit")) return "/pages/admin/audit-logs.html";
	}
	const workspace = user.role === "PARENT" ? "parent" : user.role === "TEACHER" ? "teacher" : user.role === "STUDENT" ? "student" : "admin";
	return `/pages/${workspace}/notifications.html`;
};
const list = async (user) => (await repository.findAll({ userId: user.userId })).map((notification) => ({ ...notification, targetPath: targetPath(notification, user) }));
const markRead = async (id, user) => { const notification = await repository.findById(id); if (!notification) throw new NotFoundError("Notification not found"); if (notification.userId !== user.userId) throw new AppError("You can only update your own notifications.", 403, "NOTIFICATION_ACCESS_DENIED"); return repository.markRead(id); };
const unreadCount = (user) => repository.countUnread(user.userId);
const markAllRead = (user) => repository.markAllRead(user.userId);
module.exports = { create, list, markRead, unreadCount, markAllRead };
