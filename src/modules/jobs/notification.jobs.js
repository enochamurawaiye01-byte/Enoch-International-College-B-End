const announcementService = require("../announcements/announcement.service");

const publishScheduledAnnouncements = () => announcementService.publishScheduled();

module.exports = { publishScheduledAnnouncements };
