const assert = require("node:assert/strict");
const { test } = require("node:test");
const { prisma } = require("../../src/config/database");
const transcriptRepository = require("../../src/modules/transcripts/transcript.repository");
const transcriptService = require("../../src/modules/transcripts/transcript.service");

test("transcripts display the class recorded for each historical result", async (t) => {
  const originalFindUnique = prisma.student.findUnique;
  prisma.student.findUnique = async () => ({
    id: "student-1",
    firstName: "Jordan",
    lastName: "Adebayo",
    registrationNumber: "MIC/2026/000014",
    admissionNumber: "APP-14",
    gender: "OTHER",
    admissionDate: new Date("2026-09-01T00:00:00.000Z"),
    user: { email: "jordan@example.test" },
    currentClass: { id: "class-ss2", name: "SS2 A" },
    results: [{
      session: { name: "2025/2026" },
      term: { name: "Third Term" },
      exam: {
        subject: { name: "Mathematics" },
        class: { name: "JSS3 A" },
        title: "Final Examination",
      },
      score: 80,
      totalMarks: 100,
      percentage: 80,
      grade: "A",
      status: "PUBLISHED",
      position: 2,
    }],
    reportCards: [{
      class: { id: "class-jss3", name: "JSS3 A" },
      entries: [],
    }],
  });
  t.after(() => {
    prisma.student.findUnique = originalFindUnique;
  });

  const transcript = await transcriptService.getStudentTranscript("student-1");

  assert.equal(transcript.student.registrationNumber, "MIC/2026/000014");
  assert.equal(transcript.student.currentClass, "SS2 A");
  assert.equal(transcript.sessions["2025/2026"]["Third Term"][0].class, "JSS3 A");
  assert.equal(transcript.reportCards[0].class.name, "JSS3 A");
});

test("transcript CSV uses the class from the result's exam", async (t) => {
  const originalFindStudents = transcriptRepository.findStudents;
  transcriptRepository.findStudents = async () => [{
    firstName: "Jordan",
    lastName: "Adebayo",
    registrationNumber: "MIC/2026/000014",
    currentClass: { name: "SS2 A" },
    results: [{
      exam: { class: { name: "JSS3 A" }, subject: { name: "Mathematics" }, title: "Final Examination" },
      session: { name: "2025/2026" },
      term: { name: "Third Term" },
      score: 80,
      totalMarks: 100,
      percentage: 80,
      status: "PUBLISHED",
    }],
  }];
  t.after(() => {
    transcriptRepository.findStudents = originalFindStudents;
  });

  const csv = await transcriptService.getCsv({});

  assert.match(csv, /Jordan Adebayo","MIC\/2026\/000014","JSS3 A"/);
  assert.doesNotMatch(csv, /Jordan Adebayo","MIC\/2026\/000014","SS2 A"/);
});
