const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./announcement.repository");
const { isAdmin, audiencesForRole, audienceRoles } = require("./announcement.utils");
const { prisma } = require("../../config/database");
const pushService = require("../notifications/push.service");
const getById = async (id, user) => {
	const item = await repository.findById(id);
	if (!item) throw new NotFoundError("Announcement not found");
	if (user && !isAdmin(user.role)) {
		const now = new Date();
		if (!item.published
			|| (item.publishAt && item.publishAt > now)
			|| (item.expiresAt && item.expiresAt < now)
			|| !audiencesForRole(user.role).includes(item.audience)) {
			throw new NotFoundError("Announcement not found");
		}
	}
	return item;
};
const create = async (data, user) => { if (!isAdmin(user.role)) throw new AppError("Only administrators can create announcements.", 403, "ANNOUNCEMENT_ACCESS_DENIED"); return repository.create({ ...data, audience: data.audience || "ALL", published: false }); };
const update = async (id, data, user) => { if (!isAdmin(user.role)) throw new AppError("Only administrators can update announcements.", 403, "ANNOUNCEMENT_ACCESS_DENIED"); await getById(id); return repository.update(id, data); };
const publish = async (id, published, user) => {
	if (!isAdmin(user.role)) throw new AppError("Only administrators can publish announcements.", 403, "ANNOUNCEMENT_PUBLISH_DENIED");
	const announcement = await getById(id);
	if (!published) return announcement.published ? repository.update(id, { published: false }) : announcement;
	if (announcement.published) return announcement;

	const roles = audienceRoles(announcement.audience);
	const recipients = await prisma.user.findMany({
		where: { status: "ACTIVE", ...(roles ? { role: { in: roles } } : {}) },
		select: { id: true },
	});
	const notificationRows = recipients.map(({ id: userId }) => ({
		userId,
		type: "ANNOUNCEMENT",
		title: announcement.title,
		message: announcement.message,
	}));
	const wasPublished = await repository.publishAndCreateNotifications(id, notificationRows);
	if (wasPublished) {
		try {
			await pushService.sendToUsers(recipients.map(({ id: userId }) => userId), {
				title: announcement.title,
				body: announcement.message.slice(0, 1200),
			});
		} catch (error) {
			console.error(`[Announcement push failed] announcementId=${id} message=${error.message}`);
		}
	}
	return getById(id);
};
const remove = async (id, user) => {
	if (!isAdmin(user.role)) throw new AppError("Only administrators can delete announcements.", 403, "ANNOUNCEMENT_ACCESS_DENIED");
	await getById(id);
	return repository.remove(id);
};
const list = async (query, user) => {
	const where = {};
	if (isAdmin(user.role) && query.manage === "true") return repository.findAll(where);
	where.published = true;
	where.audience = { in: audiencesForRole(user.role) };
	const now = new Date();
	where.AND = [
		{ OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
		{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
	];
	return repository.findAll(where);
};
const publishScheduled = async () => {
	const dueAnnouncements = await repository.findDue(new Date());
	for (const announcement of dueAnnouncements) await publish(announcement.id, true, { role: "ADMIN" });
	return dueAnnouncements.length;
};
module.exports = { create, update, publish, remove, getById, list, publishScheduled };
