const { prisma } = require("../../config/database");

const publishScheduledAnnouncements = () => prisma.announcement.updateMany({ where: { published: false, publishAt: { lte: new Date() } }, data: { published: true } });

module.exports = { publishScheduledAnnouncements };
