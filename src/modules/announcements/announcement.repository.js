const { prisma } = require("../../config/database");
const findById = (id) => prisma.announcement.findUnique({ where: { id } });
const findAll = (where) => prisma.announcement.findMany({ where, orderBy: [{ createdAt: "desc" }] });
const create = (data) => prisma.announcement.create({ data });
const update = (id, data) => prisma.announcement.update({ where: { id }, data });
const remove = (id) => prisma.announcement.delete({ where: { id } });
const findDue = (now) => prisma.announcement.findMany({ where: { published: false, publishAt: { lte: now } }, select: { id: true } });
const publishAndCreateNotifications = (id, notifications) => prisma.$transaction(async (tx) => {
	const { count } = await tx.announcement.updateMany({ where: { id, published: false }, data: { published: true, publishAt: new Date() } });
	if (!count) return false;
	for (let index = 0; index < notifications.length; index += 500) {
		await tx.notification.createMany({ data: notifications.slice(index, index + 500) });
	}
	return true;
});
module.exports = { findById, findAll, create, update, remove, findDue, publishAndCreateNotifications };
