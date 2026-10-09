const assert = require("node:assert/strict");
const test = require("node:test");
const { canViewTeacherApplications } = require("../../src/modules/teachers/teacher.constants");

test("only school administrators can view teacher application letters", () => {
  assert.equal(canViewTeacherApplications("ADMIN"), true);
  assert.equal(canViewTeacherApplications("SUPER_ADMIN"), true);
  assert.equal(canViewTeacherApplications("PRINCIPAL"), false);
  assert.equal(canViewTeacherApplications("HEAD_TEACHER"), false);
  assert.equal(canViewTeacherApplications("TEACHER"), false);
});
