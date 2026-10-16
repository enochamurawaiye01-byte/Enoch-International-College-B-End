const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/report-cards/report-card.repository");
const reportCardService = require("../../src/modules/report-cards/report-card.service");

test("assignment-scoped result entry supports specific teaching roles", async (t) => {
  const names = [
    "findStaffByUserId",
    "findTeacherAssignment",
    "findClass",
    "findSession",
    "findTerm",
    "findClassSubject",
    "findConfiguration",
    "findEnrollmentRoster",
  ];
  const original = Object.fromEntries(names.map((name) => [name, repository[name]]));
  repository.findStaffByUserId = async () => ({ id: "staff-1", status: "ACTIVE" });
  repository.findTeacherAssignment = async ({ staffId, classId, subjectId }) => {
    assert.equal(staffId, "staff-1");
    assert.equal(classId, "class-1");
    assert.equal(subjectId, "subject-1");
    return { id: "assignment-1" };
  };
  repository.findClass = async () => ({ id: "class-1", name: "SSS 1", isActive: true, classLevel: { code: "SS1" } });
  repository.findSession = async () => ({ id: "session-1" });
  repository.findTerm = async () => ({ id: "term-1", sessionId: "session-1", type: "FIRST" });
  repository.findClassSubject = async () => ({ id: "class-subject-1", subject: { id: "subject-1", isActive: true } });
  repository.findConfiguration = async () => null;
  repository.findEnrollmentRoster = async () => [];

  try {
    const result = await reportCardService.getEntrySheet(
      { classId: "class-1", subjectId: "subject-1", sessionId: "session-1", termId: "term-1" },
      { userId: "teacher-user", role: "SUBJECT_TEACHER" }
    );
    assert.equal(result.teacherId, "staff-1");
    assert.deepEqual(result.students, []);
  } finally {
    names.forEach((name) => { repository[name] = original[name]; });
  }
});

test("teaching roles cannot enter results outside their subject assignment", async () => {
  const original = {
    findStaffByUserId: repository.findStaffByUserId,
    findTeacherAssignment: repository.findTeacherAssignment,
  };
  repository.findStaffByUserId = async () => ({ id: "staff-1", status: "ACTIVE" });
  repository.findTeacherAssignment = async () => null;

  try {
    await assert.rejects(
      reportCardService.getEntrySheet(
        { classId: "class-1", subjectId: "subject-1", sessionId: "session-1", termId: "term-1" },
        { userId: "teacher-user", role: "CLASS_TEACHER" }
      ),
      (error) => error.code === "TEACHER_ASSIGNMENT_REQUIRED" && error.statusCode === 403
    );
  } finally {
    repository.findStaffByUserId = original.findStaffByUserId;
    repository.findTeacherAssignment = original.findTeacherAssignment;
  }
});
