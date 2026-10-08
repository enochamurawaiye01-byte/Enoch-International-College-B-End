const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/teachers/teacher.repository");
const { prisma } = require("../../src/config/database");
const teacherService = require("../../src/modules/teachers/teacher.service");

test("activating an inactive teacher sends an employment letter through Mailgun", async () => {
  const originalFindById = repository.findById;
  const originalUpdate = repository.update;
  const originalUserUpdate = prisma.user.update;
  const originalFetch = global.fetch;
  const originalMailgunKey = process.env.MAILGUN_API_KEY;
  const originalMailgunDomain = process.env.MAILGUN_DOMAIN;
  const originalMailgunFrom = process.env.MAILGUN_FROM_EMAIL;
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

  process.env.MAILGUN_API_KEY = "mailgun-test-key";
  process.env.MAILGUN_DOMAIN = "mg.example.invalid";
  process.env.MAILGUN_FROM_EMAIL = "Mercy T International College <noreply@mg.example.invalid>";
  global.fetch = async (url, options) => {
    messages.push({ url, fields: new URLSearchParams(options.body) });
    return { status: 200, ok: true, json: async () => ({ id: "<test-message-id>", message: "Queued. Thank you." }) };
  };

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
    assert.equal(messages[0].url, "https://api.mailgun.net/v3/mg.example.invalid/messages");
    assert.equal(messages[0].fields.get("to"), "daniel@school.invalid");
    assert.equal(messages[0].fields.get("subject"), "Employment appointment letter | Mercy T International College");
    assert.match(messages[0].fields.get("text"), /Staff ID: MIC\/STF\/0123456789ABCDEF/);
    assert.match(messages[0].fields.get("text"), /Department: Science/);
    assert.equal(result.communication.email, true);
    assert.equal(result.communication.emailMessageId, "<test-message-id>");
  } finally {
    repository.findById = originalFindById;
    repository.update = originalUpdate;
    prisma.user.update = originalUserUpdate;
    global.fetch = originalFetch;
    if (originalMailgunKey === undefined) delete process.env.MAILGUN_API_KEY;
    else process.env.MAILGUN_API_KEY = originalMailgunKey;
    if (originalMailgunDomain === undefined) delete process.env.MAILGUN_DOMAIN;
    else process.env.MAILGUN_DOMAIN = originalMailgunDomain;
    if (originalMailgunFrom === undefined) delete process.env.MAILGUN_FROM_EMAIL;
    else process.env.MAILGUN_FROM_EMAIL = originalMailgunFrom;
  }
});
