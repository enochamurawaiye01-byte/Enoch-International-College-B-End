const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAssessment, canEnterTermAssessment, DEFAULT_ASSESSMENT_CONFIGURATION, mergeAssessmentScores, hasCompleteAssessmentScores, rankByAverage, reportCardPublicationState, reportCardPortalPublicationUpdate } = require("../../src/modules/report-cards/report-card.utils");
const { batchResultSchema } = require("../../src/modules/report-cards/report-card.validator");
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

test("allows staged CA entry while preserving previously saved scores", () => {
  const firstSave = mergeAssessmentScores({ firstTest: 12 }, {});
  assert.deepEqual(firstSave, { firstTest: 12, secondTest: null, exam: null });
  assert.equal(hasCompleteAssessmentScores(firstSave), false);

  const laterSave = mergeAssessmentScores({ secondTest: 16 }, firstSave);
  assert.deepEqual(laterSave, { firstTest: 12, secondTest: 16, exam: null });
  assert.equal(hasCompleteAssessmentScores(laterSave), false);

  const completed = mergeAssessmentScores({ exam: 45 }, laterSave);
  assert.deepEqual(completed, { firstTest: 12, secondTest: 16, exam: 45 });
  assert.equal(hasCompleteAssessmentScores(completed), true);
  assert.equal(calculateAssessment(completed).total, 73);
});

test("ranks complete report averages and gives tied averages the same position", () => {
  assert.deepEqual(rankByAverage([
    { id: "third", average: 68 },
    { id: "first", average: 92 },
    { id: "tied", average: 92 },
    { id: "fourth", average: 54 },
  ]), [
    { id: "first", position: 1 },
    { id: "tied", position: 1 },
    { id: "third", position: 3 },
    { id: "fourth", position: 4 },
  ]);
});

test("batch score entry accepts partial components for staged saves", () => {
  const payload = {
    classId: "123e4567-e89b-12d3-a456-426614174000",
    subjectId: "123e4567-e89b-12d3-a456-426614174001",
    sessionId: "123e4567-e89b-12d3-a456-426614174002",
    termId: "123e4567-e89b-12d3-a456-426614174003",
    entries: [{
      studentId: "123e4567-e89b-12d3-a456-426614174004",
      firstTest: 14,
    }],
  };
  assert.equal(batchResultSchema.safeParse(payload).success, true);
  assert.equal(batchResultSchema.safeParse({
    ...payload,
    entries: [{ studentId: payload.entries[0].studentId }],
  }).success, false);
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