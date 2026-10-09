const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./notification.repository");
const pushService = require("./push.service");
const { isAdmin } = require("./notification.utils");
const create = async (data, user) => {
	if (!isAdmin(user.role)) throw new AppError("Only administrators can create system notifications.", 403, "NOTIFICATION_ACCESS_DENIED");
	const notification = await repository.create(data);
	try {
		await pushService.sendToUsers([notification.userId], {
			title: notification.title,
			body: notification.message,
		});
	} catch (error) {
		console.error(`[Notification push failed] notificationId=${notification.id} message=${error.message}`);
	}
	return notification;
};
const MANAGEMENT_ROLES = new Set([
	"MANAGEMENT", "GOVERNING_BOARD", "PRINCIPAL", "VICE_PRINCIPAL", "VICE_PRINCIPAL_ACADEMICS",
	"VICE_PRINCIPAL_ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD_TEACHER", "ACADEMIC_COORDINATOR",
	"HEAD_OF_DEPARTMENT", "SUBJECT_COORDINATOR", "DEAN_OF_STUDENTS"
]);
const TEACHER_WORKSPACE_ROLES = new Set([
	"TEACHER", "STAFF", "SENIOR_TEACHER", "CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_COUNSELOR",
	"LIBRARIAN", "LAB_ATTENDANT", "HEALTH_OFFICER", "DRIVER", "HOSTEL_WARDEN", "INVENTORY_OFFICER", "SECURITY_CHIEF"
]);

const targetPath = (notification, user) => {
	const text = `${notification.title} ${notification.message}`.toLowerCase();
	if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
		if (text.includes("application") || text.includes("applicant")) return "/pages/admin/applicants.html";
		if (text.includes("academic session") || text.includes("term")) return "/pages/admin/academic-sessions.html";
		if (text.includes("audit")) return "/pages/admin/audit-logs.html";
	}
	const workspace = user.role === "PARENT" ? "parent"
		: user.role === "STUDENT" ? "student"
			: MANAGEMENT_ROLES.has(user.role) ? "management"
				: TEACHER_WORKSPACE_ROLES.has(user.role) ? "teacher" : "admin";
	return `/pages/${workspace}/notifications.html`;
};
const list = async (user) => (await repository.findAll({ userId: user.userId })).map((notification) => {
	const assignment = notification.roleAssignment;
	const canActivateRole = assignment?.status === "PENDING"
		&& assignment.activationExpiresAt
		&& assignment.activationExpiresAt > new Date();
	return {
		...notification,
		canActivateRole: Boolean(canActivateRole),
		targetPath: canActivateRole
			? `/activate-role.html?assignmentId=${encodeURIComponent(assignment.id)}`
			: targetPath(notification, user)
	};
});
const markRead = async (id, user) => { const notification = await repository.findById(id); if (!notification) throw new NotFoundError("Notification not found"); if (notification.userId !== user.userId) throw new AppError("You can only update your own notifications.", 403, "NOTIFICATION_ACCESS_DENIED"); return repository.markRead(id); };
const unreadCount = (user) => repository.countUnread(user.userId);
const markAllRead = (user) => repository.markAllRead(user.userId);
module.exports = { create, list, markRead, unreadCount, markAllRead };
