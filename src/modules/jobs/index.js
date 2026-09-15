const cleanup = require("./cleanup.jobs");
const notifications = require("./notification.jobs");
const payments = require("./payment.jobs");
const reports = require("./report.jobs");

const runMaintenanceJobs = async () => {
    const results = await Promise.all([
        cleanup.cleanupExpiredSessions(),
        cleanup.markOverdueInvoices(),
        notifications.publishScheduledAnnouncements(),
        payments.markOverdueFeeAccounts(),
        reports.archiveOldAuditLogs(),
    ]);
    return results;
};

const startJobRunner = () => {
    if (process.env.ENABLE_JOBS !== "true") return null;
    const interval = setInterval(() => {
        runMaintenanceJobs().catch((error) => console.error("Maintenance jobs failed:", error));
    }, Number(process.env.JOBS_INTERVAL_MS) || 15 * 60 * 1000);
    interval.unref();
    runMaintenanceJobs().catch((error) => console.error("Initial maintenance jobs failed:", error));
    return interval;
};

module.exports = { runMaintenanceJobs, startJobRunner };