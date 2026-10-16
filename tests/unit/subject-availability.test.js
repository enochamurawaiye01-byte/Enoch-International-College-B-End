const test = require("node:test");
const assert = require("node:assert/strict");
const { isSubjectAvailable } = require("../../src/core/utils/subject-availability");
const { createSubjectSchema } = require("../../src/modules/subjects/subject.validator");

test("subject availability matches JSS and selected SSS departments", () => {
  const subject = {
    targets: [
      { classLevel: { code: "JSS1" }, departmentId: null },
      { classLevel: { code: "JSS2" }, departmentId: null },
      { classLevel: { code: "JSS3" }, departmentId: null },
      { classLevel: { code: "SS1" }, departmentId: "science" },
      { classLevel: { code: "SS1" }, departmentId: "arts" },
    ],
  };

  assert.equal(isSubjectAvailable(subject, "JSS3", null), true);
  assert.equal(isSubjectAvailable(subject, "SS1", "science"), true);
  assert.equal(isSubjectAvailable(subject, "SS1", ["commercial"]), false);
  assert.equal(isSubjectAvailable(subject, "SS2", "science"), false);
});

test("subject creation requires departments only for SSS", () => {
  const common = { name: "Mathematics", code: "MAT", description: "" };

  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "JSS" }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "SSS", departmentIds: ["123e4567-e89b-12d3-a456-426614174000"] }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "SSS" }).success, false);
  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "JSS", departmentIds: ["123e4567-e89b-12d3-a456-426614174000"] }).success, false);
});
