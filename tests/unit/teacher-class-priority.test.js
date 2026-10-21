const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const resultRepository = require("../../src/modules/results/result.repository");
const resultService = require("../../src/modules/results/result.service");
const reportCardRepository = require("../../src/modules/report-cards/report-card.repository");
const reportCardService = require("../../src/modules/report-cards/report-card.service");

test("active class-teacher assignment takes precedence over other subject assignments", async (t) => {
  await t.test("report-card entry sheet denies a different subject-assigned class", async () => {
    const originals = {
      staff: reportCardRepository.findStaffByUserId,
      classTeacherAssignments: reportCardRepository.findClassTeacherAssignments,
      teacherAssignment: reportCardRepository.findTeacherAssignment,
    };
    let subjectAssignmentQueried = false;
    reportCardRepository.findStaffByUserId = async () => ({ id: "staff-1", status: "ACTIVE" });
    reportCardRepository.findClassTeacherAssignments = async () => [{ classId: "jss2a" }];
    reportCardRepository.findTeacherAssignment = async () => {
      subjectAssignmentQueried = true;
      return { id: "subject-assignment-jss1a" };
    };

    try {
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
      assert.equal(subjectAssignmentQueried, false);
    } finally {
      reportCardRepository.findStaffByUserId = originals.staff;
      reportCardRepository.findClassTeacherAssignments = originals.classTeacherAssignments;
      reportCardRepository.findTeacherAssignment = originals.teacherAssignment;
    }
  });

  await t.test("report-card list ignores subject assignments for a class teacher", async () => {
    const originals = {
      staff: reportCardRepository.findStaffByUserId,
      classTeacherAssignments: prisma.classTeacherAssignment.findMany,
      teacherAssignments: prisma.teacherAssignment.findMany,
      findAll: reportCardRepository.findAll,
    };
    let teacherAssignmentsQueried = false;
    let findAllQueried = false;
    prisma.classTeacherAssignment.findMany = async () => [{ classId: "jss2a", sessionId: "session-1" }];
    prisma.teacherAssignment.findMany = async () => {
      teacherAssignmentsQueried = true;
      return [{ classId: "jss1a", subjectId: "math" }];
    };
    reportCardRepository.findStaffByUserId = async () => ({ id: "staff-1" });
    reportCardRepository.findAll = async () => {
      findAllQueried = true;
      return [];
    };

    try {
      const reports = await reportCardService.getAll({ classId: "jss1a" }, {
        userId: "teacher-1",
        schoolId: "school-1",
        role: "TEACHER",
      });
      assert.deepEqual(reports, []);
      assert.equal(teacherAssignmentsQueried, false);
      assert.equal(findAllQueried, false);
    } finally {
      reportCardRepository.findStaffByUserId = originals.staff;
      prisma.classTeacherAssignment.findMany = originals.classTeacherAssignments;
      prisma.teacherAssignment.findMany = originals.teacherAssignments;
      reportCardRepository.findAll = originals.findAll;
    }
  });

  await t.test("legacy result list ignores unrelated subject assignments", async () => {
    const originals = {
      staff: prisma.staff.findUnique,
      classTeacherAssignments: prisma.classTeacherAssignment.findMany,
      teacherAssignments: prisma.teacherAssignment.findMany,
      resultFindMany: prisma.result.findMany,
    };
    let receivedWhere;
    let teacherAssignmentsQueried = false;
    prisma.staff.findUnique = async () => ({ id: "staff-1" });
    prisma.classTeacherAssignment.findMany = async () => [{ classId: "jss2a", sessionId: "session-1" }];
    prisma.teacherAssignment.findMany = async () => {
      teacherAssignmentsQueried = true;
      return [{ classId: "jss1a", subjectId: "math" }];
    };
    prisma.result.findMany = async ({ where }) => {
      receivedWhere = where;
      return [];
    };

    try {
      await resultRepository.findForTeacher("teacher-1", { schoolId: "school-1", sessionId: "session-1" });
      assert.deepEqual(receivedWhere.OR, [
        { exam: { classId: "jss2a" }, sessionId: "session-1" },
      ]);
      assert.equal(teacherAssignmentsQueried, false);
    } finally {
      prisma.staff.findUnique = originals.staff;
      prisma.classTeacherAssignment.findMany = originals.classTeacherAssignments;
      prisma.teacherAssignment.findMany = originals.teacherAssignments;
      prisma.result.findMany = originals.resultFindMany;
    }
  });

  await t.test("direct result lookup denies another subject-assigned class", async () => {
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
    prisma.teacherAssignment.findFirst = async () => {
      subjectAssignmentQueried = true;
      return { id: "subject-assignment-jss1a" };
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
      assert.equal(subjectAssignmentQueried, false);
    } finally {
      resultRepository.findById = originals.resultFindById;
      prisma.staff.findUnique = originals.staff;
      prisma.classTeacherAssignment.findMany = originals.classTeacherAssignments;
      prisma.teacherAssignment.findFirst = originals.teacherAssignment;
    }
  });
});
