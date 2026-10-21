const assert = require("node:assert/strict");
const { test } = require("node:test");
const { prisma } = require("../../src/config/database");
const transcriptRepository = require("../../src/modules/transcripts/transcript.repository");
const transcriptService = require("../../src/modules/transcripts/transcript.service");
const classRepository = require("../../src/modules/classes/class.repository");
const { hasPermission } = require("../../src/core/middleware/authorization.middleware");

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
    user: { id: "student-user", schoolId: "school-1", email: "jordan@example.test" },
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

  const transcript = await transcriptService.getStudentTranscript("student-1", {
    userId: "admin-1",
    schoolId: "school-1",
    role: "SUPER_ADMIN",
  });

  assert.equal(transcript.student.registrationNumber, "MIC/2026/000014");
  assert.equal(transcript.student.currentClass, "SS2 A");
  assert.equal(transcript.sessions["2025/2026"]["Third Term"][0].class, "JSS3 A");
  assert.equal(transcript.reportCards[0].class.name, "JSS3 A");
});

test("teachers can read transcripts only for students in their assigned classes", async (t) => {
  const originalFindUnique = prisma.student.findUnique;
  const originalFindTeacherClassIds = classRepository.findTeacherClassIds;
  prisma.student.findUnique = async () => ({
    id: "student-1",
    currentClassId: "class-assigned",
    firstName: "Jordan",
    lastName: "Adebayo",
    registrationNumber: "MIC/2026/000014",
    gender: "OTHER",
    admissionDate: new Date("2026-09-01T00:00:00.000Z"),
    user: { id: "student-user", schoolId: "school-1", email: "jordan@example.test" },
    currentClass: { id: "class-assigned", name: "JSS 1 A" },
    enrollments: [],
    results: [],
    reportCards: [],
  });
  classRepository.findTeacherClassIds = async (userId, schoolId, role) => {
    assert.equal(userId, "teacher-1");
    assert.equal(schoolId, "school-1");
    assert.equal(role, "CLASS_TEACHER");
    return ["class-assigned"];
  };
  t.after(() => {
    prisma.student.findUnique = originalFindUnique;
    classRepository.findTeacherClassIds = originalFindTeacherClassIds;
  });

  const transcript = await transcriptService.getStudentTranscript("student-1", {
    userId: "teacher-1",
    schoolId: "school-1",
    role: "CLASS_TEACHER",
  });
  assert.equal(transcript.student.id, "student-1");

  classRepository.findTeacherClassIds = async () => ["another-class"];
  await assert.rejects(
    transcriptService.getStudentTranscript("student-1", {
      userId: "teacher-1",
      schoolId: "school-1",
      role: "CLASS_TEACHER",
    }),
    (error) => error.code === "TRANSCRIPT_ACCESS_DENIED" && error.statusCode === 403
  );
});

test("teaching accounts can request only the transcript route covered by the scoped service", async (t) => {
  const originals = {
    userPermission: prisma.userPermission.findFirst,
    roleAssignments: prisma.userRoleAssignment.findMany,
    role: prisma.role.findUnique,
    rolePermission: prisma.rolePermission.findFirst,
  };
  prisma.userPermission.findFirst = async () => null;
  prisma.userRoleAssignment.findMany = async () => [];
  prisma.role.findUnique = async () => null;
  prisma.rolePermission.findFirst = async () => null;
  t.after(() => {
    prisma.userPermission.findFirst = originals.userPermission;
    prisma.userRoleAssignment.findMany = originals.roleAssignments;
    prisma.role.findUnique = originals.role;
    prisma.rolePermission.findFirst = originals.rolePermission;
  });

  const teacher = { userId: "teacher-1", role: "CLASS_TEACHER" };
  assert.equal(await hasPermission(teacher, "transcripts:view", {
    method: "GET",
    originalUrl: "/api/transcripts/student/student-1",
  }), true);
  assert.equal(await hasPermission(teacher, "transcripts:view", {
    method: "GET",
    originalUrl: "/api/transcripts/download",
  }), false);
});

test("transcript CSV uses the class from the result's exam", async (t) => {
  const originalFindStudents = transcriptRepository.findStudents;
  transcriptRepository.findStudents = async () => [{
    firstName: "Jordan",
    lastName: "Adebayo",
    registrationNumber: "MIC/ADJ/00014",
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

  const csv = await transcriptService.getCsv({}, { role: "SUPER_ADMIN" });

  assert.match(csv, /Jordan Adebayo","MIC\/ADJ\/00014","JSS3 A"/);
  assert.doesNotMatch(csv, /Jordan Adebayo","MIC\/ADJ\/00014","SS2 A"/);
});
