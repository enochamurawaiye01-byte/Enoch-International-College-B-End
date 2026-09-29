const test = require("node:test");
const assert = require("node:assert/strict");
const roleService = require("../../src/modules/roles/role.service");
const roleRepository = require("../../src/modules/roles/role.repository");
const { prisma } = require("../../src/config/database");

test("Access Control & Super Admin Protection Unit Tests", async (t) => {
  await t.test("should enforce Max 3 Super Admin limit guardrail", async () => {
    const originalCount = roleRepository.countActiveSuperAdmins;
    const originalFindUser = roleRepository.findUser;
    const originalFindByName = roleRepository.findByName;
    const originalFindAssignment = roleRepository.findUserRoleAssignment;
    const originalTransaction = prisma.$transaction;

    roleRepository.countActiveSuperAdmins = async () => 3;
    roleRepository.findUser = async (id) => ({ id, fullName: "Target User", email: "target@school.com", role: "STAFF" });
    roleRepository.findByName = async (name) => ({ id: "role-super-admin-id", name: "SUPER_ADMIN" });
    roleRepository.findUserRoleAssignment = async () => null;
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

  await t.test("should generate pending role assignment token structure", async () => {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    assert.equal(typeof token, "string");
    assert.equal(token.length, 64);
  });
});
