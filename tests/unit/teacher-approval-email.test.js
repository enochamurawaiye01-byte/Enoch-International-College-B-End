const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const repository = require("../../src/modules/teachers/teacher.repository");
const { prisma } = require("../../src/config/database");
const teacherService = require("../../src/modules/teachers/teacher.service");

test("activating an inactive teacher sends an employment appointment email", async () => {
  const originalFindById = repository.findById;
  const originalUpdate = repository.update;
  const originalUserUpdate = prisma.user.update;
  const originalCreateTransport = nodemailer.createTransport;
  const originalUser = process.env.SMTP_USER;
  const originalPassword = process.env.SMTP_PASSWORD;
  const originalPort = process.env.SMTP_PORT;
  const originalSecure = process.env.SMTP_SECURE;
  const messages = [];
  const teacher = {
    id: "staff-1",
    firstName: "Daniel",
    lastName: "Teacher",
    staffNumber: "MIC/STF/0123456789ABCDEF",
    profileImageUrl: null,
    teacherAssignments: [],
    user: {
      id: "user-1",
      fullName: "Daniel Teacher",
      email: "daniel@school.invalid",
      role: "TEACHER",
      status: "INACTIVE",
    },
    department: { name: "Science" },
  };

  process.env.SMTP_USER = "mailer-test@school.invalid";
  process.env.SMTP_PASSWORD = "test-only-password";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  nodemailer.createTransport = () => ({
    sendMail: async (message) => {
      messages.push(message);
      return { messageId: "teacher-approval-test", response: "250 OK", accepted: [message.to], rejected: [] };
    },
  });

  try {
    repository.findById = async () => teacher;
    repository.update = async (_id, data) => {
      teacher.status = data.status;
      return teacher;
    };
    prisma.user.update = async ({ data }) => {
      teacher.user.status = data.status;
      return teacher.user;
    };

    const result = await teacherService.changeStatus("staff-1", "ACTIVE");

    assert.equal(messages.length, 1);
    assert.equal(messages[0].to, "daniel@school.invalid");
    assert.match(messages[0].subject, /Employment appointment letter/);
    assert.match(messages[0].text, /EMPLOYMENT APPOINTMENT LETTER/);
    assert.match(messages[0].text, /Staff ID: MIC\/STF\/0123456789ABCDEF/);
    assert.match(messages[0].text, /Department: Science/);
    assert.equal(result.communication.email, true);
    assert.equal(result.communication.emailMessageId, "teacher-approval-test");
  } finally {
    repository.findById = originalFindById;
    repository.update = originalUpdate;
    prisma.user.update = originalUserUpdate;
    nodemailer.createTransport = originalCreateTransport;
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
