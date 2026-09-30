const test = require("node:test");
const assert = require("node:assert/strict");
const { sendEmail } = require("../../src/config/mailer");

test("mailer reports missing SMTP configuration as a failure", async () => {
  const originalUser = process.env.SMTP_USER;
  const originalPassword = process.env.SMTP_PASSWORD;
  process.env.SMTP_USER = "";
  process.env.SMTP_PASSWORD = "";

  try {
    await assert.rejects(
      sendEmail({ to: "recipient@example.com", subject: "Test", text: "Test" }),
      /Email delivery is not configured/
    );
  } finally {
    if (originalUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = originalUser;
    if (originalPassword === undefined) delete process.env.SMTP_PASSWORD;
    else process.env.SMTP_PASSWORD = originalPassword;
  }
});

test("mailer rejects an empty recipient", async () => {
  await assert.rejects(
    sendEmail({ to: "", subject: "Test", text: "Test" }),
    /valid email recipient is required/
  );
});

test("mailer rejects a malformed recipient before opening SMTP", async () => {
  await assert.rejects(
    sendEmail({ to: "not-an-email", subject: "Test", text: "Test" }),
    /valid email recipient is required/
  );
});