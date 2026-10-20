const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/teacher-assignments/teacher-assignment.repository");
const service = require("../../src/modules/teacher-assignments/teacher-assignment.service");

test("only one class teacher may be assigned to a class in one session", async () => {
  const originals = {
    findStaffById: repository.findStaffById,
    findClassById: repository.findClassById,
    findSession: repository.findSession,
    findClassTeacherAssignmentByClassSession: repository.findClassTeacherAssignmentByClassSession,
    saveClassTeacherAssignment: repository.saveClassTeacherAssignment,
  };
  repository.findStaffById = async () => ({
    id: "staff-2",
    status: "ACTIVE",
    user: { status: "ACTIVE", role: "CLASS_TEACHER" },
  });
  repository.findClassById = async () => ({ id: "class-1", isActive: true });
  repository.findSession = async () => ({ id: "session-1" });
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
    findClassTeacherAssignmentByClassSession: repository.findClassTeacherAssignmentByClassSession,
    saveClassTeacherAssignment: repository.saveClassTeacherAssignment,
  };
  const existing = { id: "assignment-1", staffId: "staff-1" };
  repository.findStaffById = async () => ({
    id: "staff-1",
    status: "ACTIVE",
    user: { status: "ACTIVE", role: "CLASS_TEACHER" },
  });
  repository.findClassById = async () => ({ id: "class-1", isActive: true });
  repository.findSession = async () => ({ id: "session-1" });
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

test("staff with an active CLASS_TEACHER role assignment can be assigned even when it is not their primary role", async () => {
  const originals = {
    findStaffById: repository.findStaffById,
    findClassById: repository.findClassById,
    findSession: repository.findSession,
    findClassTeacherAssignmentByClassSession: repository.findClassTeacherAssignmentByClassSession,
    saveClassTeacherAssignment: repository.saveClassTeacherAssignment,
  };
  const expected = { id: "assignment-2", staffId: "staff-2", classId: "class-2", sessionId: "session-1" };
  repository.findStaffById = async () => ({
    id: "staff-2",
    status: "ACTIVE",
    user: {
      status: "ACTIVE",
      role: "TEACHER",
      roleAssignments: [{ status: "ACTIVE", role: { name: "CLASS_TEACHER", isActive: true } }],
    },
  });
  repository.findClassById = async () => ({ id: "class-2", isActive: true });
  repository.findSession = async () => ({ id: "session-1" });
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
