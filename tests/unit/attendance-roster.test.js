const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/attendance/attendance.repository");
const service = require("../../src/modules/attendance/attendance.service");

test("attendance roster is limited to active students enrolled for the selected term and includes saved statuses", async () => {
  const originals = {
    findClassById: repository.findClassById,
    findSession: repository.findSession,
    findTerm: repository.findTerm,
    findActiveClassRoster: repository.findActiveClassRoster,
    findRosterAttendance: repository.findRosterAttendance,
  };
  const enrollments = [
    { studentId: "student-1", student: { id: "student-1", firstName: "Ada", lastName: "A" } },
    { studentId: "student-2", student: { id: "student-2", firstName: "Ben", lastName: "B" } },
  ];
  repository.findClassById = async () => ({ id: "class-1" });
  repository.findSession = async () => ({ id: "session-1" });
  repository.findTerm = async () => ({ id: "term-1", sessionId: "session-1" });
  repository.findActiveClassRoster = async (...args) => {
    assert.deepEqual(args, ["class-1", "session-1", "term-1"]);
    return enrollments;
  };
  repository.findRosterAttendance = async (...args) => {
    assert.deepEqual(args.slice(0, 4), [["student-1", "student-2"], "class-1", "session-1", "term-1"]);
    return [{ studentId: "student-2", status: "ABSENT" }];
  };

  try {
    const result = await service.getRoster({
      classId: "class-1",
      sessionId: "session-1",
      termId: "term-1",
      date: new Date("2026-10-20T12:00:00.000Z"),
    }, { userId: "admin-1", role: "ADMIN" });
    assert.deepEqual(result.students, [
      { id: "student-1", firstName: "Ada", lastName: "A", status: null },
      { id: "student-2", firstName: "Ben", lastName: "B", status: "ABSENT" },
    ]);
  } finally {
    Object.assign(repository, originals);
  }
});
