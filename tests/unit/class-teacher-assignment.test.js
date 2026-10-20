const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const repository = require("../../src/modules/teacher-assignments/teacher-assignment.repository");
const service = require("../../src/modules/teacher-assignments/teacher-assignment.service");

test("only one class teacher may be assigned to a class in one session", async () => {
  const originals = {
    findStaffById: repository.findStaffById,
    findClassById: repository.findClassById,
    findSession: repository.findSession,
    findClassTeacherRole: repository.findClassTeacherRole,
    findClassTeacherAssignmentByClassSession: repository.findClassTeacherAssignmentByClassSession,
    saveClassTeacherAssignment: repository.saveClassTeacherAssignment,
  };
  repository.findStaffById = async () => ({
    id: "staff-2",
    status: "ACTIVE",
    user: { id: "user-2", status: "ACTIVE", role: "CLASS_TEACHER" },
  });
  repository.findClassById = async () => ({ id: "class-1", isActive: true });
  repository.findSession = async () => ({ id: "session-1" });
  repository.findClassTeacherRole = async () => ({ id: "role-1", isActive: true });
  repository.findClassTeacherAssignmentByClassSession = async () => ({
    id: "assignment-1",
    staffId: "staff-1",
  });
  repository.saveClassTeacherAssignment = async () => {
    throw new Error("Must not replace an existing assignment.");
  };

  try {
    await assert.rejects(
      service.assignClassTeacher(
        { staffId: "staff-2", classId: "class-1", sessionId: "session-1" },
        { userId: "admin-1", role: "ADMIN" }
      ),
      (error) => error.code === "CLASS_TEACHER_ALREADY_ASSIGNED" && error.statusCode === 409
    );
  } finally {
    Object.assign(repository, originals);
  }
});

test("re-saving the same class teacher assignment is idempotent", async () => {
  const originals = {
    findStaffById: repository.findStaffById,
    findClassById: repository.findClassById,
    findSession: repository.findSession,
    findClassTeacherRole: repository.findClassTeacherRole,
    ensureClassTeacherRole: repository.ensureClassTeacherRole,
    findClassTeacherAssignmentByClassSession: repository.findClassTeacherAssignmentByClassSession,
    saveClassTeacherAssignment: repository.saveClassTeacherAssignment,
  };
  const existing = { id: "assignment-1", staffId: "staff-1" };
  repository.findStaffById = async () => ({
    id: "staff-1",
    status: "ACTIVE",
    user: { id: "user-1", status: "ACTIVE", role: "CLASS_TEACHER" },
  });
  repository.findClassById = async () => ({ id: "class-1", isActive: true });
  repository.findSession = async () => ({ id: "session-1" });
  repository.findClassTeacherRole = async () => ({ id: "role-1", isActive: true });
  repository.ensureClassTeacherRole = async () => {};
  repository.findClassTeacherAssignmentByClassSession = async () => existing;
  repository.saveClassTeacherAssignment = async () => {
    throw new Error("An existing assignment should be returned.");
  };

  try {
    assert.equal(
      await service.assignClassTeacher(
        { staffId: "staff-1", classId: "class-1", sessionId: "session-1" },
        { userId: "admin-1", role: "ADMIN" }
      ),
      existing
    );
  } finally {
    Object.assign(repository, originals);
  }
});

test("an active staff account can be assigned as class teacher without a pre-existing teaching role", async () => {
  const originals = {
    findStaffById: repository.findStaffById,
    findClassById: repository.findClassById,
    findSession: repository.findSession,
    findClassTeacherRole: repository.findClassTeacherRole,
    findClassTeacherAssignmentByClassSession: repository.findClassTeacherAssignmentByClassSession,
    saveClassTeacherAssignment: repository.saveClassTeacherAssignment,
  };
  const expected = { id: "assignment-2", staffId: "staff-2", classId: "class-2", sessionId: "session-1" };
  repository.findStaffById = async () => ({
    id: "staff-2",
    status: "ACTIVE",
    user: {
      id: "user-2",
      status: "ACTIVE",
      role: "STAFF",
      roleAssignments: [],
    },
  });
  repository.findClassById = async () => ({ id: "class-2", isActive: true });
  repository.findSession = async () => ({ id: "session-1" });
  repository.findClassTeacherRole = async () => ({ id: "role-1", isActive: true });
  repository.findClassTeacherAssignmentByClassSession = async () => null;
  repository.saveClassTeacherAssignment = async (data) => ({ ...expected, ...data });

  try {
    assert.deepEqual(
      await service.assignClassTeacher(
        { staffId: "staff-2", classId: "class-2", sessionId: "session-1" },
        { userId: "admin-1", role: "ADMIN" }
      ),
      { ...expected, assignedById: "admin-1" }
    );
  } finally {
    Object.assign(repository, originals);
  }
});

test("class teacher assignment activates the role, preserves the prior teacher role, and refreshes sessions", async () => {
  const originalTransaction = prisma.$transaction;
  const roleUpserts = [];
  const userUpdates = [];
  let sessionInvalidations = 0;
  const assignment = {
    id: "assignment-3",
    staffId: "staff-3",
    staff: { userId: "user-3", user: { role: "TEACHER" } },
  };
  prisma.$transaction = async (callback) => callback({
    classTeacherAssignment: { create: async () => assignment },
    role: {
      findUnique: async ({ where }) => ({
        id: where.name === "CLASS_TEACHER" ? "class-teacher-role" : "teacher-role",
        name: where.name,
        isActive: true,
      }),
    },
    userRoleAssignment: {
      upsert: async (args) => {
        roleUpserts.push(args);
        return args.create;
      },
    },
    user: { update: async (args) => userUpdates.push(args) },
    userSession: { deleteMany: async () => { sessionInvalidations += 1; return { count: 1 }; } },
  });

  try {
    assert.equal(await repository.saveClassTeacherAssignment({
      staffId: "staff-3",
      classId: "class-3",
      sessionId: "session-1",
      assignedById: "admin-1",
    }), assignment);
    assert.deepEqual(roleUpserts.map(({ create }) => create.roleId), ["class-teacher-role", "teacher-role"]);
    assert.deepEqual(roleUpserts.map(({ create }) => create.status), ["ACTIVE", "ACTIVE"]);
    assert.deepEqual(userUpdates, [{
      where: { id: "user-3" },
      data: { role: "CLASS_TEACHER" },
    }]);
    assert.equal(sessionInvalidations, 1);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
