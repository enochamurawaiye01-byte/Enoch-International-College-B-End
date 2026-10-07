const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const dns = require("node:dns").promises;
const net = require("node:net");
const { EventEmitter } = require("node:events");
const mailer = require("../../src/config/mailer");
const { sendEmail } = mailer;

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

test("professional school emails include the correct account and role identifiers", async () => {
  const originalCreateTransport = nodemailer.createTransport;
  const originalResolve4 = dns.resolve4;
  const originalLookup = dns.lookup;
  const originalConnect = net.connect;
  const originalUser = process.env.SMTP_USER;
  const originalPassword = process.env.SMTP_PASSWORD;
  const originalPort = process.env.SMTP_PORT;
  const originalSecure = process.env.SMTP_SECURE;
  const messages = [];
  let transportOptions;

  process.env.SMTP_USER = "mailer-test@school.invalid";
  process.env.SMTP_PASSWORD = "test-only-password";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_SECURE = "true";
  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return {
      sendMail: async (message) => {
        messages.push(message);
        if (message.to === "rejected@school.invalid") {
          return { messageId: "rejected-test-message", response: "550 Rejected", accepted: [], rejected: [message.to] };
        }
        return { messageId: "unit-test-message", response: "250 OK", accepted: [message.to], rejected: [] };
      }
    };
  };

  try {
    await mailer.studentApplicationApproved({
      to: "student@school.invalid",
      name: "Amina Student",
      username: "student@school.invalid",
      applicationNumber: "APP-2026-001"
    });
    await mailer.studentAdmissionApproved({
      to: "student@school.invalid",
      name: "Amina Student",
      username: "student@school.invalid",
      registrationNumber: "MIC/2026/0011223344556677",
      classOrProgramme: "Primary 4"
    });
    await mailer.teacherAccountApproved({
      to: "teacher@school.invalid",
      name: "Daniel Teacher",
      username: "teacher@school.invalid",
      staffId: "MIC/STF/2026/001",
      role: "CLASS_TEACHER"
    });
    await mailer.sendRoleAssignmentEmail({
      to: "teacher@school.invalid",
      name: "Daniel Teacher",
      username: "teacher@school.invalid",
      staffId: "MIC/STF/2026/001",
      roles: ["HEAD_TEACHER"],
      activationUrl: "https://school.invalid/activate-role.html?assignmentId=assignment-1"
    });
    await mailer.sendRoleActivatedEmail({
      to: "teacher@school.invalid",
      name: "Daniel Teacher",
      username: "teacher@school.invalid",
      staffId: "MIC/STF/2026/001",
      role: "HEAD_TEACHER"
    });

    assert.equal(messages.length, 5);
    assert.equal(transportOptions.secure, true);
    assert.equal(transportOptions.requireTLS, false);
    assert.ok(messages.every((message) => typeof message.html === "string" && typeof message.text === "string"));
    assert.equal(messages[0].to, "student@school.invalid");
    assert.match(messages[0].text, /Application reference: APP-2026-001/);
    assert.match(messages[0].text, /Account username: student@school\.invalid/);
    assert.doesNotMatch(messages[0].text, /Registration number:/);
    assert.equal(messages[1].to, "student@school.invalid");
    assert.match(messages[1].text, /Registration number: MIC\/2026\/0011223344556677/);
    assert.match(messages[1].text, /Congratulations!/);
    assert.match(messages[1].text, /Account username: student@school\.invalid/);
    assert.equal(messages[2].to, "teacher@school.invalid");
    assert.match(messages[2].text, /Staff ID: MIC\/STF\/2026\/001/);
    assert.match(messages[2].text, /EMPLOYMENT APPOINTMENT LETTER/);
    assert.match(messages[2].text, /welcome you to the team/);
    assert.match(messages[2].text, /Position: Class Teacher/);
    assert.equal(messages[3].to, "teacher@school.invalid");
    assert.match(messages[3].text, /HEAD_TEACHER|Head Teacher/);
    assert.match(messages[3].text, /Pending activation/);
    assert.match(messages[4].text, /Your Head Teacher role .* has been activated/);
    await assert.rejects(
      sendEmail({ to: "rejected@school.invalid", subject: "Test", text: "Test" }),
      (error) => error.code === "SMTP_RECIPIENT_REJECTED"
    );

    const connectOptions = [];
    dns.resolve4 = async () => {
      throw Object.assign(new Error("A record resolver unavailable"), { code: "ECONNREFUSED" });
    };
    dns.lookup = async (_host, options) => {
      assert.deepEqual(options, { family: 4, all: true });
      return [
        { address: "192.0.2.1", family: 4 },
        { address: "192.0.2.2", family: 4 },
      ];
    };
    net.connect = (options) => {
      connectOptions.push(options);
      const socket = new EventEmitter();
      socket.destroy = (error) => socket.emit("error", error);
      queueMicrotask(() => {
        if (connectOptions.length === 1) {
          const error = new Error("First IPv4 address is unreachable");
          error.code = "ENETUNREACH";
          socket.emit("error", error);
        } else {
          socket.emit("connect");
        }
      });
      return socket;
    };
    const connectedSocket = await new Promise((resolve, reject) => {
      transportOptions.getSocket({ host: "smtp.gmail.com", port: 465 }, (error, options) => {
        if (error) return reject(error);
        resolve(options.connection);
      });
    });
    assert.ok(connectedSocket);
    assert.equal(connectOptions.length, 2);
    assert.ok(connectOptions.every(({ family, port }) => family === 4 && port === 465));
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    dns.resolve4 = originalResolve4;
    dns.lookup = originalLookup;
    net.connect = originalConnect;
    if (originalUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = originalUser;
    if (originalPassword === undefined) delete process.env.SMTP_PASSWORD;
    else process.env.SMTP_PASSWORD = originalPassword;
    if (originalPort === undefined) delete process.env.SMTP_PORT;
    else process.env.SMTP_PORT = originalPort;
    if (originalSecure === undefined) delete process.env.SMTP_SECURE;
    else process.env.SMTP_SECURE = originalSecure;
  }
});