const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/teacher-assignments/teacher-assignment.repository");
const service = require("../../src/modules/teacher-assignments/teacher-assignment.service");

test("BOTH teacher assignment creates subject assignments across JSS and SSS classes", async (t) => {
  const names = ["findStaffById", "findSubjectById", "findSession", "findTerm", "findClassesWithSubject", "createForClasses"];
  const original = Object.fromEntries(names.map((name) => [name, repository[name]]));
  const created = [];
  repository.findStaffById = async () => ({ id: "staff-1", status: "ACTIVE" });
  repository.findSubjectById = async () => ({ id: "subject-1" });
  repository.findSession = async () => null;
  repository.findTerm = async () => null;
  repository.findClassesWithSubject = async (subjectId, level) => {
    assert.equal(subjectId, "subject-1");
    assert.equal(level, "BOTH");
    return [{ class: { id: "jss-class" } }, { class: { id: "sss-class" } }];
  };
  repository.createForClasses = async (assignments) => {
    created.push(...assignments);
    return { createdCount: assignments.length, assignments };
  };

  try {
    const result = await service.create({
      staffId: "staff-1",
      subjectId: "subject-1",
      classLevel: "BOTH",
    });
    assert.equal(result.createdCount, 2);
    assert.deepEqual(created.map(({ classId }) => classId), ["jss-class", "sss-class"]);
    assert.ok(created.every(({ staffId, subjectId, sessionId, termId }) =>
      staffId === "staff-1" && subjectId === "subject-1" && sessionId === null && termId === null));
  } finally {
    names.forEach((name) => { repository[name] = original[name]; });
  }
});
