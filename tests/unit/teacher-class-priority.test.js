const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const resultRepository = require("../../src/modules/results/result.repository");
const resultService = require("../../src/modules/results/result.service");
const reportCardRepository = require("../../src/modules/report-cards/report-card.repository");
const reportCardService = require("../../src/modules/report-cards/report-card.service");

test("class-teacher and subject-teacher assignments provide separate result scopes", async (t) => {
  await t.test("report-card entry sheet allows an explicitly assigned subject in another class", async () => {
    const originals = {
      staff: reportCardRepository.findStaffByUserId,
      classTeacherAssignments: reportCardRepository.findClassTeacherAssignments,
      teacherAssignment: reportCardRepository.findTeacherAssignment,
      findClass: reportCardRepository.findClass,
      findSession: reportCardRepository.findSession,
      findTerm: reportCardRepository.findTerm,
      findClassSubject: reportCardRepository.findClassSubject,
      findConfiguration: reportCardRepository.findConfiguration,
      findEnrollmentRoster: reportCardRepository.findEnrollmentRoster,
      findCurrentClassRoster: reportCardRepository.findCurrentClassRoster,
    };
    reportCardRepository.findStaffByUserId = async () => ({ id: "staff-1", status: "ACTIVE" });
    reportCardRepository.findClassTeacherAssignments = async () => [{ classId: "jss2a", sessionId: "session-1" }];
    reportCardRepository.findTeacherAssignment = async (where) =>
      where.classId === "jss1a" && where.subjectId === "english" ? { id: "subject-assignment-jss1a-english" } : null;
    reportCardRepository.findClass = async (id) => ({ id, isActive: true, classLevel: { code: "JSS1" } });
    reportCardRepository.findSession = async () => ({ id: "session-1", schoolId: "school-1" });
    reportCardRepository.findTerm = async () => ({ id: "term-1", sessionId: "session-1", type: "FIRST" });
    reportCardRepository.findClassSubject = async (_classId, subjectId) => ({
      id: `class-subject-${subjectId}`,
      subject: { id: subjectId, name: subjectId, isActive: true },
    });
    reportCardRepository.findConfiguration = async () => null;
    reportCardRepository.findEnrollmentRoster = async () => [];
    reportCardRepository.findCurrentClassRoster = async () => [];

    try {
      const sheet = await reportCardService.getEntrySheet({
          classId: "jss1a",
          subjectId: "english",
          sessionId: "session-1",
          termId: "term-1",
        }, {
          userId: "teacher-1",
          schoolId: "school-1",
          role: "TEACHER",
        });
      assert.equal(sheet.class.id, "jss1a");
      assert.equal(sheet.subject.name, "english");
      const classTeacherSheet = await reportCardService.getEntrySheet({
        classId: "jss2a",
        subjectId: "math",
        sessionId: "session-1",
        termId: "term-1",
      }, {
        userId: "teacher-1",
        schoolId: "school-1",
        role: "TEACHER",
      });
      assert.equal(classTeacherSheet.class.id, "jss2a");
      assert.equal(classTeacherSheet.subject.name, "math");
      await assert.rejects(
        reportCardService.getEntrySheet({
          classId: "jss1a",
          subjectId: "math",
          sessionId: "session-1",
          termId: "term-1",
        }, {
          userId: "teacher-1",
          schoolId: "school-1",
          role: "TEACHER",
        }),
        (error) => error.code === "TEACHER_ASSIGNMENT_REQUIRED"
      );
    } finally {
      reportCardRepository.findStaffByUserId = originals.staff;
      reportCardRepository.findClassTeacherAssignments = originals.classTeacherAssignments;
      reportCardRepository.findTeacherAssignment = originals.teacherAssignment;
      reportCardRepository.findClass = originals.findClass;
      reportCardRepository.findSession = originals.findSession;
      reportCardRepository.findTerm = originals.findTerm;
      reportCardRepository.findClassSubject = originals.findClassSubject;
      reportCardRepository.findConfiguration = originals.findConfiguration;
      reportCardRepository.findEnrollmentRoster = originals.findEnrollmentRoster;
      reportCardRepository.findCurrentClassRoster = originals.findCurrentClassRoster;
    }
  });

  await t.test("report-card list returns assigned-subject entries plus all class-teacher entries", async () => {
    const originals = {
      staff: reportCardRepository.findStaffByUserId,
      classTeacherAssignments: prisma.classTeacherAssignment.findMany,
      teacherAssignments: prisma.teacherAssignment.findMany,
      findAll: reportCardRepository.findAll,
    };
    let receivedWhere;
    prisma.classTeacherAssignment.findMany = async () => [{ classId: "jss2a", sessionId: "session-1" }];
    prisma.teacherAssignment.findMany = async () => {
      return [{ classId: "jss1a", subjectId: "english", sessionId: "session-1", termId: null }];
    };
    reportCardRepository.findStaffByUserId = async () => ({ id: "staff-1" });
    reportCardRepository.findAll = async (where) => {
      receivedWhere = where;
      return [
        { classId: "jss1a", sessionId: "session-1", termId: "term-1", entries: [{ subjectId: "english" }, { subjectId: "math" }] },
        { classId: "jss2a", sessionId: "session-1", termId: "term-1", entries: [{ subjectId: "english" }, { subjectId: "math" }] },
      ];
    };

    try {
      const reports = await reportCardService.getAll({}, {
        userId: "teacher-1",
        schoolId: "school-1",
        role: "TEACHER",
      });
      assert.deepEqual(receivedWhere.OR, [{
        classId: "jss1a",
        sessionId: "session-1",
        entries: { some: { subjectId: "english" } },
      }, {
        classId: "jss2a",
        sessionId: "session-1",
      }]);
      assert.deepEqual(reports.map((report) => report.entries.map((entry) => entry.subjectId)), [
        ["english"],
        ["english", "math"],
      ]);
    } finally {
      reportCardRepository.findStaffByUserId = originals.staff;
      prisma.classTeacherAssignment.findMany = originals.classTeacherAssignments;
      prisma.teacherAssignment.findMany = originals.teacherAssignments;
      reportCardRepository.findAll = originals.findAll;
    }
  });

  await t.test("legacy result list combines subject and class-teacher scopes", async () => {
    const originals = {
      staff: prisma.staff.findUnique,
      classTeacherAssignments: prisma.classTeacherAssignment.findMany,
      teacherAssignments: prisma.teacherAssignment.findMany,
      resultFindMany: prisma.result.findMany,
    };
    let receivedWhere;
    prisma.staff.findUnique = async () => ({ id: "staff-1" });
    prisma.classTeacherAssignment.findMany = async () => [{ classId: "jss2a", sessionId: "session-1" }];
    prisma.teacherAssignment.findMany = async () => {
      return [{ classId: "jss1a", subjectId: "english", sessionId: "session-1", termId: null }];
    };
    prisma.result.findMany = async ({ where }) => {
      receivedWhere = where;
      return [];
    };

    try {
      await resultRepository.findForTeacher("teacher-1", { schoolId: "school-1", sessionId: "session-1" });
      assert.deepEqual(receivedWhere.OR, [
        { exam: { classId: "jss1a", subjectId: "english" }, sessionId: "session-1" },
        { exam: { classId: "jss2a" }, sessionId: "session-1" },
      ]);
    } finally {
      prisma.staff.findUnique = originals.staff;
      prisma.classTeacherAssignment.findMany = originals.classTeacherAssignments;
      prisma.teacherAssignment.findMany = originals.teacherAssignments;
      prisma.result.findMany = originals.resultFindMany;
    }
  });

  await t.test("direct result lookup still rejects a subject not explicitly assigned", async () => {
    const originals = {
      resultFindById: resultRepository.findById,
      staff: prisma.staff.findUnique,
      classTeacherAssignments: prisma.classTeacherAssignment.findMany,
      teacherAssignment: prisma.teacherAssignment.findFirst,
    };
    let subjectAssignmentQueried = false;
    resultRepository.findById = async () => ({
      id: "result-1",
      student: { user: { schoolId: "school-1" } },
      exam: { classId: "jss1a", subjectId: "math" },
      sessionId: "session-1",
      termId: "term-1",
    });
    prisma.staff.findUnique = async () => ({ id: "staff-1" });
    prisma.classTeacherAssignment.findMany = async () => [{ classId: "jss2a" }];
    prisma.teacherAssignment.findFirst = async ({ where }) => {
      subjectAssignmentQueried = true;
      assert.equal(where.classId, "jss1a");
      assert.equal(where.subjectId, "math");
      return null;
    };

    try {
      await assert.rejects(
        resultService.getById("result-1", {
          userId: "teacher-1",
          schoolId: "school-1",
          role: "TEACHER",
        }),
        (error) => error.code === "RESULT_ACCESS_DENIED"
      );
      assert.equal(subjectAssignmentQueried, true);
    } finally {
      resultRepository.findById = originals.resultFindById;
      prisma.staff.findUnique = originals.staff;
      prisma.classTeacherAssignment.findMany = originals.classTeacherAssignments;
      prisma.teacherAssignment.findFirst = originals.teacherAssignment;
    }
  });
});
