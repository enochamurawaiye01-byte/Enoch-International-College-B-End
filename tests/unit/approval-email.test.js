const test = require("node:test");
const assert = require("node:assert/strict");
const userRepository = require("../../src/modules/users/user.repository");
const { prisma } = require("../../src/config/database");
const userService = require("../../src/modules/users/user.service");

test("approved student and teacher accounts trigger their Klaviyo approval flow", async () => {
  const originalFindById = userRepository.findById;
  const originalStudentFindUnique = prisma.student.findUnique;
  const originalStaffFindUnique = prisma.staff.findUnique;
  const originalFetch = global.fetch;
  const originalPrivateKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const originalApiKey = process.env.KLAVIYO_API_KEY;
  const events = [];
  process.env.KLAVIYO_PRIVATE_API_KEY = "klaviyo-test-key";
  global.fetch = async (_url, options) => {
    events.push(JSON.parse(options.body).data.attributes);
    return { status: 202, ok: true, json: async () => ({}) };
  };

  try {
    userRepository.findById = async (id) => ({
      id,
      email: `${id}@school.invalid`,
      fullName: id === "student-1" ? "Amina Student" : "Daniel Teacher",
      role: id === "student-1" ? "STUDENT" : "TEACHER",
      status: "ACTIVE",
    });
    prisma.student.findUnique = async () => ({
      registrationNumber: "MIC/2026/0123456789ABCDEF",
      currentClass: { name: "Primary 4" },
      currentSession: { name: "2026/2027" },
    });
    prisma.staff.findUnique = async () => ({
      staffNumber: "MIC/STF/0123456789ABCDEF",
      department: { name: "Science" },
    });

    const actor = { userId: "admin-1", role: "ADMIN" };
    const studentResult = await userService.resendApprovalEmail("student-1", actor);
    const teacherResult = await userService.resendApprovalEmail("teacher-1", actor);

    assert.equal(studentResult.email, true);
    assert.equal(teacherResult.email, true);
    assert.equal(events.length, 2);
    assert.equal(events[0].properties.role, "STUDENT");
    assert.equal(events[0].properties.registration_number, "MIC/2026/0123456789ABCDEF");
    assert.equal(events[0].properties.class_or_programme, "Primary 4");
    assert.equal(events[0].properties.academic_session, "2026/2027");
    assert.equal(events[1].properties.role, "TEACHER");
    assert.equal(events[1].properties.registration_number, "MIC/STF/0123456789ABCDEF");
    assert.equal(events[1].properties.department, "Science");
  } finally {
    userRepository.findById = originalFindById;
    prisma.student.findUnique = originalStudentFindUnique;
    prisma.staff.findUnique = originalStaffFindUnique;
    global.fetch = originalFetch;
    if (originalPrivateKey === undefined) delete process.env.KLAVIYO_PRIVATE_API_KEY;
    else process.env.KLAVIYO_PRIVATE_API_KEY = originalPrivateKey;
    if (originalApiKey === undefined) delete process.env.KLAVIYO_API_KEY;
    else process.env.KLAVIYO_API_KEY = originalApiKey;
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
