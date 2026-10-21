const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const classRepository = require("../../src/modules/classes/class.repository");
const studentRepository = require("../../src/modules/students/student.repository");
const studentService = require("../../src/modules/students/student.service");

test("teacher student access combines only explicitly assigned classes", async (t) => {
  await t.test("class and subject assignments both contribute their assigned classes", async () => {
    const originals = {
      staffFindUnique: prisma.staff.findUnique,
      sessionsFindMany: prisma.academicSession.findMany,
      classAssignmentsFindMany: prisma.classTeacherAssignment.findMany,
      teacherAssignmentsFindMany: prisma.teacherAssignment.findMany,
    };
    let subjectAssignmentsQueried = false;
    prisma.staff.findUnique = async () => ({ id: "staff-1" });
    prisma.academicSession.findMany = async () => [{ id: "session-active" }];
    prisma.classTeacherAssignment.findMany = async () => [
      { classId: "jss2a" },
    ];
    prisma.teacherAssignment.findMany = async () => {
      subjectAssignmentsQueried = true;
      return [{ classId: "jss1a" }];
    };

    try {
      assert.deepEqual(
        await classRepository.findTeacherClassIds("teacher-1", "school-1", "TEACHER"),
        ["jss2a", "jss1a"]
      );
      assert.equal(subjectAssignmentsQueried, true);
    } finally {
      prisma.staff.findUnique = originals.staffFindUnique;
      prisma.academicSession.findMany = originals.sessionsFindMany;
      prisma.classTeacherAssignment.findMany = originals.classAssignmentsFindMany;
      prisma.teacherAssignment.findMany = originals.teacherAssignmentsFindMany;
    }
  });

  await t.test("a student with a different current class is denied despite a stale active enrollment", async () => {
    const originals = {
      findById: studentRepository.findById,
      findTeacherClassIds: studentRepository.findTeacherClassIds,
    };
    studentRepository.findById = async () => ({
      id: "student-1",
      userId: "student-user",
      currentClassId: "jss1a",
      user: { schoolId: "school-1" },
      enrollments: [{
        classId: "jss2a",
        status: "ACTIVE",
        session: { isActive: true },
      }],
      reportCards: [],
    });
    studentRepository.findTeacherClassIds = async () => ["jss2a"];

    try {
      await assert.rejects(
        studentService.getStudentById("student-1", {
          userId: "teacher-1",
          schoolId: "school-1",
          role: "TEACHER",
        }),
        (error) => error.code === "TEACHER_ASSIGNMENT_REQUIRED"
      );
    } finally {
      studentRepository.findById = originals.findById;
      studentRepository.findTeacherClassIds = originals.findTeacherClassIds;
    }
  });

  await t.test("student list scope does not let an enrollment override a different current class", async () => {
    const originalFindMany = prisma.student.findMany;
    const originalCount = prisma.student.count;
    let where;
    prisma.student.findMany = async (args) => {
      where = args.where;
      return [];
    };
    prisma.student.count = async () => 0;

    try {
      await studentRepository.findAll({ classIds: ["jss2a"] });
      assert.deepEqual(where.AND[0].OR, [
        { currentClassId: { in: ["jss2a"] } },
        {
          currentClassId: null,
          enrollments: { some: { classId: { in: ["jss2a"] }, status: "ACTIVE", session: { isActive: true } } },
        },
      ]);
    } finally {
      prisma.student.findMany = originalFindMany;
      prisma.student.count = originalCount;
    }
  });

  await t.test("class roster scope does not let an enrollment override a different current class", async () => {
    const originalFindMany = prisma.student.findMany;
    let where;
    prisma.student.findMany = async (args) => {
      where = args.where;
      return [];
    };

    try {
      await classRepository.findStudents("jss2a");
      assert.deepEqual(where.OR, [
        { currentClassId: "jss2a" },
        {
          currentClassId: null,
          enrollments: { some: { classId: "jss2a", status: "ACTIVE", session: { isActive: true } } },
        },
      ]);
    } finally {
      prisma.student.findMany = originalFindMany;
    }
  });

  await t.test("a subject assignment remains limited to its explicitly assigned class", async () => {
    const originals = {
      staffFindUnique: prisma.staff.findUnique,
      sessionsFindMany: prisma.academicSession.findMany,
      classAssignmentsFindMany: prisma.classTeacherAssignment.findMany,
      teacherAssignmentFindFirst: prisma.teacherAssignment.findFirst,
    };
    let subjectAssignmentQueried = false;
    prisma.staff.findUnique = async () => ({ id: "staff-1" });
    prisma.academicSession.findMany = async () => [{ id: "session-active" }];
    prisma.classTeacherAssignment.findMany = async () => [
      { id: "assignment-jss2a", classId: "jss2a" },
    ];
    prisma.teacherAssignment.findFirst = async () => {
      subjectAssignmentQueried = true;
      return { id: "subject-assignment-jss1a" };
    };

    try {
      assert.deepEqual(
        await classRepository.findTeacherAssignment("teacher-1", "jss1a", "school-1", "TEACHER"),
        { id: "subject-assignment-jss1a" }
      );
      assert.equal(subjectAssignmentQueried, true);
    } finally {
      prisma.staff.findUnique = originals.staffFindUnique;
      prisma.academicSession.findMany = originals.sessionsFindMany;
      prisma.classTeacherAssignment.findMany = originals.classAssignmentsFindMany;
      prisma.teacherAssignment.findFirst = originals.teacherAssignmentFindFirst;
    }
  });
});
