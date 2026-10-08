const test = require("node:test");
const assert = require("node:assert/strict");
const userRepository = require("../../src/modules/users/user.repository");
const { prisma } = require("../../src/config/database");
const userService = require("../../src/modules/users/user.service");

test("approved students receive congratulations and teachers receive an employment letter", async () => {
  const originalFindById = userRepository.findById;
  const originalStudentFindUnique = prisma.student.findUnique;
  const originalStaffFindUnique = prisma.staff.findUnique;
  const originalAcademicSessionFindUnique = prisma.academicSession.findUnique;
  const originalFetch = global.fetch;
  const originalMailgunKey = process.env.MAILGUN_API_KEY;
  const originalMailgunDomain = process.env.MAILGUN_DOMAIN;
  const originalMailgunFrom = process.env.MAILGUN_FROM_EMAIL;
  const requests = [];
  process.env.MAILGUN_API_KEY = "mailgun-test-key";
  process.env.MAILGUN_DOMAIN = "mg.example.invalid";
  process.env.MAILGUN_FROM_EMAIL = "Mercy T College <noreply@mg.example.invalid>";
  global.fetch = async (url, options) => {
    requests.push({ url, fields: new URLSearchParams(options.body) });
    return { status: 200, ok: true, json: async () => ({ id: "<test-message-id>", message: "Queued. Thank you." }) };
  };

  try {
    userRepository.findById = async (id) => ({
      id,
      email: `${id}@school.invalid`,
      fullName: id === "student-1" ? "Amina Student" : "Daniel Teacher",
      role: id === "student-1" ? "STUDENT" : "TEACHER",
      status: "ACTIVE",
    });
    prisma.student.findUnique = async (query) => {
      assert.deepEqual(query.include, { currentClass: true });
      return {
        registrationNumber: "MIC/2026/0123456789ABCDEF",
        currentSessionId: "session-1",
        currentClass: { name: "Primary 4" },
      };
    };
    prisma.staff.findUnique = async () => ({
      staffNumber: "MIC/STF/0123456789ABCDEF",
      department: { name: "Science" },
    });
    prisma.academicSession.findUnique = async ({ where }) => (
      where.id === "session-1" ? { name: "2026/2027" } : null
    );

    const actor = { userId: "admin-1", role: "ADMIN" };
    const studentResult = await userService.resendApprovalEmail("student-1", actor);
    const teacherResult = await userService.resendApprovalEmail("teacher-1", actor);

    assert.equal(studentResult.email, true);
    assert.equal(teacherResult.email, true);
    assert.equal(studentResult.emailMessageId, "<test-message-id>");
    assert.equal(teacherResult.emailMessageId, "<test-message-id>");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "https://api.mailgun.net/v3/mg.example.invalid/messages");
    assert.equal(requests[0].fields.get("to"), "student-1@school.invalid");
    assert.equal(requests[0].fields.get("subject"), "Congratulations on your admission | Mercy T College");
    assert.match(requests[0].fields.get("text"), /Registration number: MIC\/2026\/0123456789ABCDEF/);
    assert.match(requests[0].fields.get("text"), /Class \/ level: Primary 4/);
    assert.match(requests[0].fields.get("text"), /Academic session: 2026\/2027/);
    assert.equal(requests[1].fields.get("to"), "teacher-1@school.invalid");
    assert.equal(requests[1].fields.get("subject"), "Employment appointment letter | Mercy T College");
    assert.match(requests[1].fields.get("text"), /Staff ID: MIC\/STF\/0123456789ABCDEF/);
    assert.match(requests[1].fields.get("text"), /Department: Science/);
  } finally {
    userRepository.findById = originalFindById;
    prisma.student.findUnique = originalStudentFindUnique;
    prisma.staff.findUnique = originalStaffFindUnique;
    prisma.academicSession.findUnique = originalAcademicSessionFindUnique;
    global.fetch = originalFetch;
    if (originalMailgunKey === undefined) delete process.env.MAILGUN_API_KEY;
    else process.env.MAILGUN_API_KEY = originalMailgunKey;
    if (originalMailgunDomain === undefined) delete process.env.MAILGUN_DOMAIN;
    else process.env.MAILGUN_DOMAIN = originalMailgunDomain;
    if (originalMailgunFrom === undefined) delete process.env.MAILGUN_FROM_EMAIL;
    else process.env.MAILGUN_FROM_EMAIL = originalMailgunFrom;
  }
});

test("resend approval email is restricted to active users and administrators", async () => {
  const originalFindById = userRepository.findById;
  try {
    userRepository.findById = async (id) => ({
      id,
      email: `${id}@school.invalid`,
      fullName: "Pending Student",
      role: "STUDENT",
      status: "INACTIVE",
    });
    await assert.rejects(
      userService.resendApprovalEmail("student-1", { userId: "admin-1", role: "ADMIN" }),
      (error) => error.code === "USER_NOT_ACTIVE"
    );
    await assert.rejects(
      userService.resendApprovalEmail("student-1", { userId: "teacher-1", role: "TEACHER" }),
      (error) => error.code === "USER_ACCESS_DENIED"
    );
  } finally {
    userRepository.findById = originalFindById;
  }
});
