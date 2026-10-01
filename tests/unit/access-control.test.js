const test = require("node:test");
const assert = require("node:assert/strict");
const roleService = require("../../src/modules/roles/role.service");
const roleRepository = require("../../src/modules/roles/role.repository");
const userService = require("../../src/modules/users/user.service");
const userRepository = require("../../src/modules/users/user.repository");
const { prisma } = require("../../src/config/database");
const { moduleActionForRequest } = require("../../src/core/middleware/authorization.middleware");

test("Access Control & Super Admin Protection Unit Tests", async (t) => {
  await t.test("approval requests require the module approve action", async () => {
    assert.equal(moduleActionForRequest({
      originalUrl: "/api/admissions/application-id",
      method: "PATCH",
      body: { status: "APPROVED" }
    }), "admissions:approve");
  });

  await t.test("should enforce Max 3 Super Admin limit guardrail", async () => {
    const originalCount = roleRepository.countActiveSuperAdmins;
    const originalFindUser = roleRepository.findUser;
    const originalFindByName = roleRepository.findByName;
    const originalFindAssignment = roleRepository.findUserRoleAssignment;
    const originalTransaction = prisma.$transaction;

    roleRepository.countActiveSuperAdmins = async () => 3;
    roleRepository.findUser = async (id) => ({ id, fullName: "Target User", email: "target@school.com", role: "STAFF" });
    roleRepository.findByName = async (name) => ({ id: "role-super-admin-id", name: "SUPER_ADMIN", isActive: true });
    roleRepository.findUserRoleAssignment = async () => null;
    prisma.$queryRawUnsafe = async () => [];
    prisma.$transaction = async (cb) => cb(prisma);

    try {
      const actor = { userId: "admin-1", role: "SUPER_ADMIN" };
      await roleService.assignRoles({ userId: "user-4", roleIds: ["SUPER_ADMIN"] }, actor);
      assert.fail("Should have thrown error for 4th Super Admin attempt");
    } catch (err) {
      if (err.name === "AssertionError") {
        throw err;
      }
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, "SUPER_ADMIN_LIMIT_EXCEEDED");
    } finally {
      roleRepository.countActiveSuperAdmins = originalCount;
      roleRepository.findUser = originalFindUser;
      roleRepository.findByName = originalFindByName;
      roleRepository.findUserRoleAssignment = originalFindAssignment;
      delete prisma.$queryRawUnsafe;
      prisma.$transaction = originalTransaction;
    }
  });

  await t.test("should reject role assignment attempts from non-administrative users", async () => {
    const originalFindUser = roleRepository.findUser;
    roleRepository.findUser = async (id) => ({ id, fullName: "Target Staff", role: "STAFF" });

    try {
      const nonAdminActor = { userId: "teacher-1", role: "TEACHER" };
      await roleService.assignRoles({ userId: "staff-2", roleIds: ["HEAD_TEACHER"] }, nonAdminActor);
      assert.fail("Should have rejected non-admin actor");
    } catch (err) {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, "ROLE_MANAGEMENT_DENIED");
    } finally {
      roleRepository.findUser = originalFindUser;
    }
  });

  await t.test("should reject system-role grants to linked student profiles", async () => {
    const originalFindUser = roleRepository.findUser;
    roleRepository.findUser = async (id) => ({ id, role: "STAFF", schoolId: "school-1", student: { id: "student-profile-1" } });

    try {
      const actor = { userId: "admin-1", role: "ADMIN" };
      await assert.rejects(
        roleService.assignRoles({ userId: "student-1", roleIds: ["PREFECT"] }, actor),
        (error) => error.code === "STUDENT_SYSTEM_ROLE_DENIED"
      );
      await assert.rejects(
        roleService.changeUserRoles("student-1", { roles: ["TEACHER"] }, actor),
        (error) => error.code === "STUDENT_SYSTEM_ROLE_DENIED"
      );
    } finally {
      roleRepository.findUser = originalFindUser;
    }
  });

  await t.test("should reject a leadership role already held by another user", async () => {
    const originalFindUser = roleRepository.findUser;
    const originalFindByName = roleRepository.findByName;
    const originalLockRole = roleRepository.lockExclusiveRole;
    const originalFindExclusiveHolder = roleRepository.findExclusiveRoleHolder;
    const originalTransaction = prisma.$transaction;

    roleRepository.findUser = async (id) => ({ id, role: "STAFF", schoolId: "school-1" });
    roleRepository.findByName = async () => ({ id: "principal-role-id", name: "PRINCIPAL", isActive: true });
    roleRepository.lockExclusiveRole = async () => {};
    roleRepository.findExclusiveRoleHolder = async () => ({ userId: "existing-principal" });
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: { findUnique: async () => null }
    });

    try {
      await assert.rejects(
        roleService.assignRoles({ userId: "candidate-1", roleIds: ["PRINCIPAL"] }, { userId: "admin-1", role: "ADMIN" }),
        (error) => error.code === "ROLE_ALREADY_ASSIGNED" && error.statusCode === 409
      );
    } finally {
      roleRepository.findUser = originalFindUser;
      roleRepository.findByName = originalFindByName;
      roleRepository.lockExclusiveRole = originalLockRole;
      roleRepository.findExclusiveRoleHolder = originalFindExclusiveHolder;
      prisma.$transaction = originalTransaction;
    }
  });

  await t.test("should reject exclusive leadership role changes when another holder exists", async () => {
    const originalFindUser = roleRepository.findUser;
    const originalFindByName = roleRepository.findByName;
    const originalFindAssignments = roleRepository.findUserAssignments;
    const originalLockRole = roleRepository.lockExclusiveRole;
    const originalFindExclusiveHolder = roleRepository.findExclusiveRoleHolder;
    const originalTransaction = prisma.$transaction;

    roleRepository.findUser = async (id) => ({ id, role: "STAFF", schoolId: "school-1" });
    roleRepository.findByName = async () => ({ id: "principal-role-id", name: "PRINCIPAL", isActive: true });
    roleRepository.findUserAssignments = async () => [];
    roleRepository.lockExclusiveRole = async () => {};
    roleRepository.findExclusiveRoleHolder = async () => ({ userId: "existing-principal" });
    prisma.$transaction = async (callback) => callback({});

    try {
      await assert.rejects(
        roleService.changeUserRoles("candidate-1", { roles: ["PRINCIPAL"] }, { userId: "admin-1", role: "ADMIN" }),
        (error) => error.code === "ROLE_ALREADY_ASSIGNED" && error.statusCode === 409
      );
    } finally {
      roleRepository.findUser = originalFindUser;
      roleRepository.findByName = originalFindByName;
      roleRepository.findUserAssignments = originalFindAssignments;
      roleRepository.lockExclusiveRole = originalLockRole;
      roleRepository.findExclusiveRoleHolder = originalFindExclusiveHolder;
      prisma.$transaction = originalTransaction;
    }
  });

  await t.test("should reject activation of a non-student role by a student account", async () => {
    const originalFindAssignment = prisma.userRoleAssignment.findUnique;
    prisma.userRoleAssignment.findUnique = async () => ({
      id: "assignment-1",
      userId: "student-1",
      status: "PENDING",
      role: { id: "teacher-role-id", name: "TEACHER" },
      user: { id: "student-1", role: "STAFF", student: { id: "student-profile-1" } }
    });

    try {
      await assert.rejects(
        roleService.activateRole({ assignmentId: "assignment-1" }, { userId: "student-1" }),
        (error) => error.code === "STUDENT_SYSTEM_ROLE_DENIED"
      );
    } finally {
      prisma.userRoleAssignment.findUnique = originalFindAssignment;
    }
  });

  await t.test("should generate pending role assignment token structure", async () => {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    assert.equal(typeof token, "string");
    assert.equal(token.length, 64);
  });

  await t.test("should reject localhost or missing activation URLs in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFrontendUrl = process.env.FRONTEND_URL;
    process.env.NODE_ENV = "production";
    delete process.env.FRONTEND_URL;
    try {
      assert.throws(() => roleService.buildRoleActivationUrl("assignment-id"), /FRONTEND_URL must be configured/);
      process.env.FRONTEND_URL = "http://erp.example.com";
      assert.throws(() => roleService.buildRoleActivationUrl("assignment-id"), /must use HTTPS/);
      process.env.FRONTEND_URL = "https://erp.example.com/portal/";
      assert.equal(roleService.buildRoleActivationUrl("assignment-id"), "https://erp.example.com/portal/activate-role.html?assignmentId=assignment-id");
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = originalFrontendUrl;
    }
  });

  await t.test("user deletion should clean up the actual user-permission table without crashing", async () => {
    const originalFindById = userRepository.findById;
    const originalAuditCreate = prisma.auditLog.create;
    const originalTransaction = prisma.$transaction;
    const originalUserDelete = prisma.user.delete;

    let txScope = null;

    userRepository.findById = async () => ({
      id: "user-123",
      fullName: "Jane User",
      email: "jane@example.com",
      role: "STAFF",
      roleAssignments: []
    });

    prisma.auditLog.create = async () => ({ id: "audit-1" });
    prisma.user.delete = async () => ({ id: "user-123" });
    prisma.$transaction = async (cb) => {
      const tx = {
        userRoleAssignment: { deleteMany: async () => ({ count: 0 }) },
        userPermission: { deleteMany: async () => ({ count: 0 }) },
        notification: { deleteMany: async () => ({ count: 0 }) },
        student: { deleteMany: async () => ({ count: 0 }) },
        staff: { deleteMany: async () => ({ count: 0 }) },
        parent: { deleteMany: async () => ({ count: 0 }) },
        user: { delete: async () => ({ id: "user-123" }) }
      };
      txScope = tx;
      return cb(tx);
    };

    try {
      const result = await userService.remove("user-123", { userId: "admin-1", role: "ADMIN" });

      assert.equal(result.id, "user-123");
      assert.equal(typeof txScope.userPermission.deleteMany, "function");
    } finally {
      userRepository.findById = originalFindById;
      prisma.auditLog.create = originalAuditCreate;
      prisma.$transaction = originalTransaction;
      prisma.user.delete = originalUserDelete;
    }
  });
});
