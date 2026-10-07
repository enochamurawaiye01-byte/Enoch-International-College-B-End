const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const userRepository = require("../../src/modules/users/user.repository");
const { prisma } = require("../../src/config/database");
const userService = require("../../src/modules/users/user.service");

test("approved student and teacher accounts can resend their role-specific emails", async () => {
  const originalFindById = userRepository.findById;
  const originalStudentFindUnique = prisma.student.findUnique;
  const originalStaffFindUnique = prisma.staff.findUnique;
  const originalCreateTransport = nodemailer.createTransport;
  const originalUser = process.env.SMTP_USER;
  const originalPassword = process.env.SMTP_PASSWORD;
  const originalPort = process.env.SMTP_PORT;
  const originalSecure = process.env.SMTP_SECURE;
  const messages = [];

  process.env.SMTP_USER = "mailer-test@school.invalid";
  process.env.SMTP_PASSWORD = "test-only-password";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  nodemailer.createTransport = () => ({
    sendMail: async (message) => {
      messages.push(message);
      return { messageId: `message-${messages.length}`, response: "250 OK", accepted: [message.to], rejected: [] };
    },
  });

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
    assert.equal(messages.length, 2);
    assert.match(messages[0].text, /Congratulations!/);
    assert.match(messages[0].text, /Registration number: MIC\/2026\/0123456789ABCDEF/);
    assert.match(messages[1].text, /EMPLOYMENT APPOINTMENT LETTER/);
    assert.match(messages[1].text, /Staff ID: MIC\/STF\/0123456789ABCDEF/);
    assert.match(messages[1].text, /Department: Science/);
  } finally {
    userRepository.findById = originalFindById;
    prisma.student.findUnique = originalStudentFindUnique;
    prisma.staff.findUnique = originalStaffFindUnique;
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
