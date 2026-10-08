const assert = require("node:assert/strict");
const { test } = require("node:test");
const repository = require("../../src/modules/auth/auth.repository");
const authService = require("../../src/modules/auth/auth.service");
const { hashPassword } = require("../../src/core/utils/hash");

test("students can complete first login and use registration number login thereafter", async (t) => {
  const originalMethods = {
    findUserWithAuthDataByEmail: repository.findUserWithAuthDataByEmail,
    findStudentWithAuthDataByRegistrationNumber: repository.findStudentWithAuthDataByRegistrationNumber,
    createSession: repository.createSession,
    updateLastLogin: repository.updateLastLogin,
    markFirstLoginComplete: repository.markFirstLoginComplete,
  };
  const originalJwtSecret = process.env.JWT_SECRET;
  const passwordHash = await hashPassword("StudentPassword123!");
  const user = {
    id: "student-user",
    fullName: "Jordan Adebayo",
    email: "jordan@example.com",
    schoolId: "school-1",
    role: "STUDENT",
    status: "ACTIVE",
    passwordHash,
    hasCompletedFirstLogin: false,
    student: { id: "student-1", status: "ACTIVE", registrationNumber: "MIC/2026/000001" },
  };
  const sessions = [];
  const markedFirstLogin = [];
  process.env.JWT_SECRET = "student-login-unit-test-secret";

  repository.findUserWithAuthDataByEmail = async () => ({ ...user });
  repository.findStudentWithAuthDataByRegistrationNumber = async (registrationNumber) => (
    registrationNumber === "MIC/2026/000001" ? { ...user, hasCompletedFirstLogin: true } : null
  );
  repository.createSession = async (session) => sessions.push(session);
  repository.updateLastLogin = async () => {};
  repository.markFirstLoginComplete = async (userId) => markedFirstLogin.push(userId);

  t.after(() => {
    Object.assign(repository, originalMethods);
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const firstLogin = await authService.login({ email: "jordan@example.com", password: "StudentPassword123!" });
  assert.equal(firstLogin.user.hasCompletedFirstLogin, true);
  assert.deepEqual(markedFirstLogin, ["student-user"]);
  assert.ok(firstLogin.accessToken);

  const nextLogin = await authService.login({ registrationNumber: "mic/2026/000001", password: "StudentPassword123!" });
  assert.equal(nextLogin.user.student.registrationNumber, "MIC/2026/000001");
  assert.equal(sessions.length, 2);

  await assert.rejects(
    authService.login({ registrationNumber: "MIC/2026/000001", password: "WrongPassword123!" }),
    (error) => error.code === "INVALID_CREDENTIALS"
  );

  repository.findUserWithAuthDataByEmail = async () => ({ ...user, hasCompletedFirstLogin: true });
  await assert.rejects(
    authService.login({ email: "jordan@example.com", password: "StudentPassword123!" }),
    (error) => error.code === "STUDENT_REGISTRATION_LOGIN_REQUIRED"
  );

  repository.findUserWithAuthDataByEmail = async () => ({ ...user, status: "SUSPENDED" });
  await assert.rejects(
    authService.login({ email: "jordan@example.com", password: "StudentPassword123!" }),
    (error) => error.code === "ACCOUNT_SUSPENDED"
  );

  repository.findUserWithAuthDataByEmail = async () => ({ ...user, status: "INACTIVE" });
  await assert.rejects(
    authService.login({ email: "jordan@example.com", password: "StudentPassword123!" }),
    (error) => error.code === "ACCOUNT_INACTIVE"
  );
});
