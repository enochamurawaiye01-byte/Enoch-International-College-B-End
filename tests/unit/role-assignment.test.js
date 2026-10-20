const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const roleRepository = require("../../src/modules/roles/role.repository");
const roleService = require("../../src/modules/roles/role.service");
const { roleAssignmentSchema } = require("../../src/modules/roles/role.validator");

test("role assignment workflows", async (t) => {
  await t.test("request validation accepts the frontend contract and rejects malformed input", () => {
    const userId = "79c7795c-b373-4e5f-9f12-d2f9f6af0a82";
    assert.equal(roleAssignmentSchema.safeParse({ userId, roleIds: ["TEACHER", "HEAD_TEACHER"] }).success, true);
    assert.equal(roleAssignmentSchema.safeParse({ userId, roleId: userId }).success, true);
    assert.equal(roleAssignmentSchema.safeParse({ userId, roleIds: [] }).success, false);
    assert.equal(roleAssignmentSchema.safeParse({ userId, roleIds: ["TEACHER", "TEACHER"] }).success, false);
    assert.equal(roleAssignmentSchema.safeParse({ userId, roleId: "TEACHER", roleIds: ["TEACHER"] }).success, false);
  });

  await t.test("unknown roles do not write an assignment", async () => {
    const originals = {
      findUser: roleRepository.findUser,
      findByName: roleRepository.findByName,
      findById: roleRepository.findById,
      transaction: prisma.$transaction
    };
    let writes = 0;
    roleRepository.findUser = async () => ({ id: "target-user", role: "STAFF", status: "ACTIVE", student: null });
    roleRepository.findByName = async () => null;
    roleRepository.findById = async () => null;
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: {
        upsert: async () => {
          writes += 1;
          assert.fail("Unknown roles must not be written");
        }
      }
    });

    try {
      await assert.rejects(
        roleService.assignRoles(
          { userId: "target-user", roleIds: ["UNKNOWN_ROLE"] },
          { userId: "admin-user", role: "ADMIN" }
        ),
        (error) => error.statusCode === 404
      );
      assert.equal(writes, 0);
    } finally {
      roleRepository.findUser = originals.findUser;
      roleRepository.findByName = originals.findByName;
      roleRepository.findById = originals.findById;
      prisma.$transaction = originals.transaction;
    }
  });

  await t.test("grants persist once and return safe notification warnings", async () => {
    const originals = {
      findUser: roleRepository.findUser,
      findByName: roleRepository.findByName,
      findById: roleRepository.findById,
      transaction: prisma.$transaction,
      notificationCreate: prisma.notification.create,
      auditCreate: prisma.auditLog.create,
      deleteSessions: prisma.userSession.deleteMany,
      consoleError: console.error
    };
    const targetUser = {
      id: "target-user",
      fullName: "Staff Member",
      email: null,
      role: "STAFF",
      status: "ACTIVE",
      schoolId: null,
      student: null
    };
    const teacherRole = { id: "teacher-role-id", name: "TEACHER", isActive: true };
    let persistedAssignments = 0;
    let sessionDeletionAttempted = false;
    let notificationErrorLog;

    roleRepository.findUser = async () => targetUser;
    roleRepository.findByName = async (name) => name === teacherRole.name ? teacherRole : null;
    roleRepository.findById = async (id) => id === teacherRole.id ? teacherRole : null;
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: {
        findUnique: async () => null,
        upsert: async ({ create }) => {
          persistedAssignments += 1;
          return { id: "assignment-id", ...create };
        }
      }
    });
    prisma.notification.create = async () => {
      throw Object.assign(new Error("database detail should not reach the response"), { code: "P5000" });
    };
    prisma.auditLog.create = async () => ({ id: "audit-id" });
    prisma.userSession.deleteMany = async () => {
      sessionDeletionAttempted = true;
      throw new Error("Session deletion is not part of pending assignment");
    };
    console.error = (...args) => { notificationErrorLog = args; };

    try {
      const result = await roleService.assignRoles(
        { userId: targetUser.id, roleIds: [teacherRole.name, teacherRole.id] },
        { userId: "admin-user", role: "ADMIN" }
      );
      assert.equal(persistedAssignments, 1);
      assert.equal(sessionDeletionAttempted, false);
      assert.equal(result.assignedRoles.length, 1);
      assert.equal(result.assignedRoles[0].status, "PENDING");
      assert.deepEqual(result.warnings, [
        "The role was saved, but its in-app notification could not be delivered."
      ]);
      assert.equal(JSON.stringify(result).includes("database detail"), false);
      assert.equal(notificationErrorLog[1].code, "P5000");
    } finally {
      roleRepository.findUser = originals.findUser;
      roleRepository.findByName = originals.findByName;
      roleRepository.findById = originals.findById;
      prisma.$transaction = originals.transaction;
      prisma.notification.create = originals.notificationCreate;
      prisma.auditLog.create = originals.auditCreate;
      prisma.userSession.deleteMany = originals.deleteSessions;
      console.error = originals.consoleError;
    }
  });

  await t.test("CLASS_TEACHER can be assigned to multiple users and is active immediately", async () => {
    const originals = {
      findUser: roleRepository.findUser,
      findByName: roleRepository.findByName,
      findById: roleRepository.findById,
      transaction: prisma.$transaction,
      auditCreate: prisma.auditLog.create
    };
    const users = new Map(["teacher-1", "teacher-2"].map((id) => [id, {
      id,
      fullName: id,
      email: null,
      role: "TEACHER",
      status: "ACTIVE",
      schoolId: "school-1",
      student: null
    }]));
    const classTeacherRole = { id: "class-teacher-role-id", name: "CLASS_TEACHER", isActive: true };
    const assignments = new Map();
    roleRepository.findUser = async (id) => users.get(id);
    roleRepository.findByName = async (name) => name === classTeacherRole.name ? classTeacherRole : null;
    roleRepository.findById = async (id) => id === classTeacherRole.id ? classTeacherRole : null;
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: {
        findUnique: async ({ where }) => assignments.get(where.userId_roleId.userId) || null,
        upsert: async ({ create }) => {
          const assignment = { id: `assignment-${create.userId}`, ...create };
          assignments.set(create.userId, assignment);
          return assignment;
        },
        update: async () => assert.fail("No pending assignment should need activation")
      },
      user: { update: async () => ({}) },
      userSession: { deleteMany: async () => ({ count: 0 }) }
    });
    prisma.auditLog.create = async () => ({ id: "audit-id" });

    try {
      for (const userId of users.keys()) {
        const result = await roleService.assignRoles(
          { userId, roleIds: [classTeacherRole.name] },
          { userId: "admin-user", role: "SUPER_ADMIN" }
        );
        assert.equal(result.assignedRoles[0].status, "ACTIVE");
      }
      assert.equal(assignments.size, 2);
      assert.deepEqual([...assignments.values()].map((assignment) => assignment.status), ["ACTIVE", "ACTIVE"]);
    } finally {
      roleRepository.findUser = originals.findUser;
      roleRepository.findByName = originals.findByName;
      roleRepository.findById = originals.findById;
      prisma.$transaction = originals.transaction;
      prisma.auditLog.create = originals.auditCreate;
    }
  });

  await t.test("bulk role changes activate CLASS_TEACHER for multiple users without pending activation", async () => {
    const originals = {
      findUser: roleRepository.findUser,
      findAssignments: roleRepository.findUserAssignments,
      roleFindUnique: prisma.role.findUnique,
      transaction: prisma.$transaction,
      auditCreate: prisma.auditLog.create
    };
    const users = new Map(["teacher-1", "teacher-2"].map((id) => [id, {
      id,
      fullName: id,
      email: null,
      role: "TEACHER",
      status: "ACTIVE",
      schoolId: "school-1",
      student: null
    }]));
    const classTeacherRole = { id: "class-teacher-role-id", name: "CLASS_TEACHER", isActive: true };
    const assignments = new Map();
    roleRepository.findUser = async (id) => users.get(id);
    roleRepository.findUserAssignments = async (userId) => assignments.has(userId) ? [assignments.get(userId)] : [];
    prisma.role.findUnique = async ({ where }) => where.name === classTeacherRole.name ? classTeacherRole : null;
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: {
        upsert: async ({ create }) => {
          const assignment = { id: `assignment-${create.userId}`, ...create, role: classTeacherRole };
          assignments.set(create.userId, assignment);
          return assignment;
        },
        findMany: async ({ where }) => assignments.has(where.userId) ? [assignments.get(where.userId)] : []
      },
      user: { update: async ({ where, data }) => Object.assign(users.get(where.id), data) },
      userSession: { deleteMany: async () => ({ count: 0 }) },
      notification: { updateMany: async () => ({ count: 0 }) }
    });
    prisma.auditLog.create = async () => ({ id: "audit-id" });

    try {
      for (const userId of users.keys()) {
        const result = await roleService.changeUserRoles(
          userId,
          { roles: [classTeacherRole.name] },
          { userId: "admin-user", role: "SUPER_ADMIN" }
        );
        assert.equal(result.assignments[0].status, "ACTIVE");
      }
      assert.equal(assignments.size, 2);
      assert.deepEqual([...assignments.values()].map((assignment) => assignment.status), ["ACTIVE", "ACTIVE"]);
      assert.deepEqual([...users.values()].map((user) => user.role), ["CLASS_TEACHER", "CLASS_TEACHER"]);
    } finally {
      roleRepository.findUser = originals.findUser;
      roleRepository.findUserAssignments = originals.findAssignments;
      prisma.role.findUnique = originals.roleFindUnique;
      prisma.$transaction = originals.transaction;
      prisma.auditLog.create = originals.auditCreate;
    }
  });

  await t.test("role revocation removes only the selected role and preserves the user's primary role", async () => {
    const originals = {
      findUser: roleRepository.findUser,
      findAssignments: roleRepository.findUserAssignments,
      findByName: roleRepository.findByName,
      transaction: prisma.$transaction,
      auditCreate: prisma.auditLog.create
    };
    const targetUser = {
      id: "teacher-user",
      fullName: "Teacher User",
      email: null,
      role: "TEACHER",
      status: "ACTIVE",
      schoolId: "school-1",
      student: null
    };
    const classTeacherRole = { id: "class-teacher-role-id", name: "CLASS_TEACHER", isActive: true };
    let revokedRoleIds = [];
    roleRepository.findUser = async () => targetUser;
    roleRepository.findByName = async (name) => name === classTeacherRole.name ? classTeacherRole : null;
    roleRepository.findUserAssignments = async () => [{
      id: "class-teacher-assignment",
      userId: targetUser.id,
      roleId: classTeacherRole.id,
      status: "ACTIVE",
      role: classTeacherRole
    }];
    roleRepository.findByName = async (name) => name === classTeacherRole.name ? classTeacherRole : null;
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: {
        update: async ({ where, data }) => {
          revokedRoleIds.push(where.userId_roleId.roleId);
          return { ...where.userId_roleId, ...data };
        },
        findMany: async () => [{ role: { name: "TEACHER" } }],
      },
      user: { update: async () => ({}) },
      userSession: { deleteMany: async () => ({ count: 1 }) },
      notification: { updateMany: async () => ({ count: 0 }) }
    });
    prisma.auditLog.create = async () => ({ id: "audit-id" });

    try {
      await roleService.revokeRole(
        { userId: targetUser.id, roleName: classTeacherRole.name },
        { userId: "admin-user", role: "ADMIN" }
      );
      assert.deepEqual(revokedRoleIds, [classTeacherRole.id]);
      assert.equal(targetUser.role, "TEACHER");
    } finally {
      roleRepository.findUser = originals.findUser;
      roleRepository.findUserAssignments = originals.findAssignments;
      roleRepository.findByName = originals.findByName;
      prisma.$transaction = originals.transaction;
      prisma.auditLog.create = originals.auditCreate;
    }
  });

  await t.test("changes remove revoked assignments and restore the default account role", async () => {
    const originals = {
      findUser: roleRepository.findUser,
      findAssignments: roleRepository.findUserAssignments,
      transaction: prisma.$transaction,
      auditCreate: prisma.auditLog.create
    };
    const targetUser = {
      id: "target-user",
      fullName: "Staff Member",
      email: null,
      role: "TEACHER",
      status: "ACTIVE",
      student: null
    };
    const removedAssignment = {
      id: "teacher-assignment",
      userId: targetUser.id,
      roleId: "teacher-role-id",
      status: "ACTIVE",
      role: { id: "teacher-role-id", name: "TEACHER" }
    };
    let removedStatus;
    let nextPrimaryRole;

    roleRepository.findUser = async () => targetUser;
    roleRepository.findUserAssignments = async () => [removedAssignment];
    prisma.$transaction = async (callback) => callback({
      userRoleAssignment: {
        update: async ({ data }) => { removedStatus = data.status; },
        findMany: async () => []
      },
      notification: { updateMany: async () => ({ count: 0 }) },
      userSession: { deleteMany: async () => ({ count: 1 }) },
      user: { update: async ({ data }) => { nextPrimaryRole = data.role; } }
    });
    prisma.auditLog.create = async () => ({ id: "audit-id" });

    try {
      await roleService.changeUserRoles(targetUser.id, { roles: [] }, { userId: "admin-user", role: "ADMIN" });
      assert.equal(removedStatus, "REMOVED");
      assert.equal(nextPrimaryRole, "STAFF");
    } finally {
      roleRepository.findUser = originals.findUser;
      roleRepository.findUserAssignments = originals.findAssignments;
      prisma.$transaction = originals.transaction;
      prisma.auditLog.create = originals.auditCreate;
    }
  });

  await t.test("non-administrators cannot change another user's roles", async () => {
    const originalAuditCreate = prisma.auditLog.create;
    prisma.auditLog.create = async () => ({ id: "audit-id" });

    try {
      await assert.rejects(
        roleService.changeUserRoles("target-user", { roles: [] }, { userId: "teacher-user", role: "TEACHER" }),
        (error) => error.statusCode === 403 && error.code === "ROLE_MANAGEMENT_DENIED"
      );
    } finally {
      prisma.auditLog.create = originalAuditCreate;
    }
  });
});
