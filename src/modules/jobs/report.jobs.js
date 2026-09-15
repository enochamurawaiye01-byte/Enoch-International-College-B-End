const { prisma } = require("../../config/database");

const archiveOldAuditLogs = async () => ({ skipped: true, reason: "AuditLog has no archive state; retention must be handled by an external archive policy." });

module.exports = { archiveOldAuditLogs };
