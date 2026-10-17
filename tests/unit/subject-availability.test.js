const test = require("node:test");
const assert = require("node:assert/strict");
const { isSubjectAvailable } = require("../../src/core/utils/subject-availability");
const { createSubjectSchema, updateSubjectSchema } = require("../../src/modules/subjects/subject.validator");
const subjectRepository = require("../../src/modules/subjects/subject.repository");
const subjectService = require("../../src/modules/subjects/subject.service");

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
  const common = { name: "Mathematics", description: "" };

  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "JSS" }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, code: "", classGroup: "JSS" }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, code: null, classGroup: "JSS" }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, code: "MAT", classGroup: "JSS" }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "SSS", departmentIds: ["123e4567-e89b-12d3-a456-426614174000"] }).success, true);
  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "SSS" }).success, false);
  assert.equal(createSubjectSchema.safeParse({ ...common, classGroup: "JSS", departmentIds: ["123e4567-e89b-12d3-a456-426614174000"] }).success, false);
  assert.equal(updateSubjectSchema.safeParse({ code: "" }).success, true);
  assert.equal(updateSubjectSchema.safeParse({ code: null }).success, true);
});

test("subject deletion rejects subjects with academic history", async () => {
  const originalDelete = subjectRepository.deleteSubjectSafely;
  subjectRepository.deleteSubjectSafely = async () => ({ found: true, inUse: true });

  try {
    await assert.rejects(subjectService.deleteSubject("subject-id"), (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "SUBJECT_IN_USE");
      return true;
    });
  } finally {
    subjectRepository.deleteSubjectSafely = originalDelete;
  }
});

test("subject deletion succeeds when the repository confirms no dependencies", async () => {
  const originalDelete = subjectRepository.deleteSubjectSafely;
  subjectRepository.deleteSubjectSafely = async () => ({ found: true, inUse: false });

  try {
    assert.deepEqual(await subjectService.deleteSubject("subject-id"), { deleted: true });
  } finally {
    subjectRepository.deleteSubjectSafely = originalDelete;
  }
});

test("creating a subject without a supplied code generates a database-compatible code", async () => {
  const names = [
    "findClassLevelsByGroup",
    "findSubjectByName",
    "findSubjectByCode",
    "createSubjectWithTargets",
  ];
  const originals = Object.fromEntries(names.map((name) => [name, subjectRepository[name]]));
  subjectRepository.findClassLevelsByGroup = async () => [{ id: "jss1-level" }];
  subjectRepository.findSubjectByName = async () => null;
  subjectRepository.findSubjectByCode = async () => null;
  subjectRepository.createSubjectWithTargets = async (data) => data;

  try {
    const result = await subjectService.createSubject({ name: "Mathematics", classGroup: "JSS" });
    assert.match(result.code, /^AUTO-[A-F0-9]{12}$/);
  } finally {
    Object.entries(originals).forEach(([name, method]) => { subjectRepository[name] = method; });
  }
});
