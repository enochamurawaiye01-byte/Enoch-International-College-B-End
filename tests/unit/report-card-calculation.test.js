const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAssessment, canEnterTermAssessment, DEFAULT_ASSESSMENT_CONFIGURATION, reportCardPublicationState, reportCardPortalPublicationUpdate } = require("../../src/modules/report-cards/report-card.utils");
const { canManageResults } = require("../../src/modules/report-cards/report-card.service");

test("calculates totals and grades from configured component maxima", () => {
  const result = calculateAssessment({ firstTest: 15, secondTest: 18, exam: 55 });

  assert.equal(result.total, 88);
  assert.equal(result.totalPossible, 100);
  assert.equal(result.percentage, 88);
  assert.equal(result.grade, "A");
  assert.equal(result.remark, "Excellent");
});

test("uses school-configured maxima and grade bands", () => {
  const result = calculateAssessment({ firstTest: 8, secondTest: 7, exam: 35 }, {
    firstTestMax: 10,
    secondTestMax: 10,
    examMax: 40,
    gradeBands: [
      { minimum: 80, grade: "A", remark: "Excellent" },
      { minimum: 0, grade: "F", remark: "Review needed" }
    ]
  });

  assert.equal(result.total, 50);
  assert.equal(result.totalPossible, 60);
  assert.equal(result.grade, "A");
});

test("rejects negative, non-finite, and over-maximum scores", () => {
  assert.throws(() => calculateAssessment({ firstTest: -1, secondTest: 0, exam: 0 }), /firstTest must be between/);
  assert.throws(() => calculateAssessment({ firstTest: 0, secondTest: 20.01, exam: 0 }), /secondTest must be between/);
  assert.throws(() => calculateAssessment({ firstTest: Number.NaN, secondTest: 0, exam: 0 }), /firstTest must be between/);
});

test("disables third-term assessments only for graduating classes", () => {
  assert.equal(canEnterTermAssessment("JSS3", "THIRD"), false);
  assert.equal(canEnterTermAssessment("SS3", "THIRD"), false);
  assert.equal(canEnterTermAssessment("JSS2", "THIRD"), true);
  assert.equal(canEnterTermAssessment("SS3", "SECOND"), true);
});

test("teacher score-entry permission never grants administrator result override", async () => {
  assert.equal(await canManageResults({ userId: "teacher-1", role: "TEACHER" }), false);
});

test("publishing a result to one portal preserves the other portal state", () => {
  assert.deepEqual(reportCardPublicationState({ studentPublished: false, parentPublished: true }, { portal: "student", published: true }), {
    studentPublished: true,
    parentPublished: true,
    published: true,
  });
  assert.deepEqual(reportCardPublicationState({ studentPublished: true, parentPublished: true }, { portal: "parent", published: false }), {
    studentPublished: true,
    parentPublished: false,
    published: true,
  });
});

test("legacy publication updates both portals and bulk updates keep the aggregate flag accurate", () => {
  assert.deepEqual(reportCardPublicationState({ studentPublished: false, parentPublished: false }, { published: true }), {
    studentPublished: true,
    parentPublished: true,
    published: true,
  });
  assert.deepEqual(reportCardPortalPublicationUpdate("student", false, true), {
    studentPublished: false,
    published: true,
  });
  assert.deepEqual(reportCardPortalPublicationUpdate("parent", false, false), {
    parentPublished: false,
    published: false,
  });
});