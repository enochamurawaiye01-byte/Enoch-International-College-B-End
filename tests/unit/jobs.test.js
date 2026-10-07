const test = require("node:test");
const assert = require("node:assert/strict");
const cleanup = require("../../src/modules/jobs/cleanup.jobs");
const notifications = require("../../src/modules/jobs/notification.jobs");
const payments = require("../../src/modules/jobs/payment.jobs");
const reports = require("../../src/modules/jobs/report.jobs");
const jobRunner = require("../../src/modules/jobs");

test("maintenance jobs run by default and can be explicitly disabled", async (t) => {
  const originalEnableJobs = process.env.ENABLE_JOBS;
  const originalInterval = process.env.JOBS_INTERVAL_MS;
  const originalSetInterval = global.setInterval;
  const originals = {
    cleanupExpiredSessions: cleanup.cleanupExpiredSessions,
    markOverdueInvoices: cleanup.markOverdueInvoices,
    publishScheduledAnnouncements: notifications.publishScheduledAnnouncements,
    markOverdueFeeAccounts: payments.markOverdueFeeAccounts,
    archiveOldAuditLogs: reports.archiveOldAuditLogs,
  };
  const calls = [];
  const restoreEnvironment = () => {
    if (originalEnableJobs === undefined) delete process.env.ENABLE_JOBS;
    else process.env.ENABLE_JOBS = originalEnableJobs;
    if (originalInterval === undefined) delete process.env.JOBS_INTERVAL_MS;
    else process.env.JOBS_INTERVAL_MS = originalInterval;
  };

  t.after(() => {
    restoreEnvironment();
    global.setInterval = originalSetInterval;
    Object.assign(cleanup, {
      cleanupExpiredSessions: originals.cleanupExpiredSessions,
      markOverdueInvoices: originals.markOverdueInvoices,
    });
    notifications.publishScheduledAnnouncements = originals.publishScheduledAnnouncements;
    payments.markOverdueFeeAccounts = originals.markOverdueFeeAccounts;
    reports.archiveOldAuditLogs = originals.archiveOldAuditLogs;
  });

  for (const name of Object.keys(originals)) {
    const owner = name in cleanup ? cleanup
      : name in notifications ? notifications
        : name in payments ? payments : reports;
    owner[name] = async () => {
      calls.push(name);
      return { job: name };
    };
  }

  let intervalDuration;
  let unrefCalled = false;
  global.setInterval = (_callback, duration) => {
    intervalDuration = duration;
    return { unref: () => { unrefCalled = true; } };
  };

  delete process.env.ENABLE_JOBS;
  process.env.JOBS_INTERVAL_MS = "1000";
  const interval = jobRunner.startJobRunner();
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(interval);
  assert.equal(intervalDuration, 1000);
  assert.equal(unrefCalled, true);
  assert.deepEqual(new Set(calls), new Set(Object.keys(originals)));

  calls.length = 0;
  process.env.ENABLE_JOBS = "false";
  assert.equal(jobRunner.startJobRunner(), null);
  assert.deepEqual(calls, []);
});
