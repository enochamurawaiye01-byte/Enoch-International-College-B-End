const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const classRepository = require("../../src/modules/classes/class.repository");
const classService = require("../../src/modules/classes/class.service");
const { hasPermission } = require("../../src/core/middleware/authorization.middleware");

test("class teacher access is assignment-scoped", async (t) => {
  await t.test("class listings show only classes assigned to the class teacher", async () => {
    const originals = {
      findTeacherClassIds: classRepository.findTeacherClassIds,
      findAllClasses: classRepository.findAllClasses
    };
    let receivedClassIds;
    classRepository.findTeacherClassIds = async (userId, schoolId) => {
      assert.equal(userId, "teacher-user");
      assert.equal(schoolId, "school-1");
      return ["assigned-class"];
    };
    classRepository.findAllClasses = async (classIds, schoolId) => {
      receivedClassIds = classIds;
      assert.equal(schoolId, "school-1");
      return [{ id: "assigned-class" }];
    };

    try {
      const classes = await classService.getAllClasses({
        userId: "teacher-user",
        schoolId: "school-1",
        role: "CLASS_TEACHER"
      });
      assert.deepEqual(receivedClassIds, ["assigned-class"]);
      assert.deepEqual(classes, [{ id: "assigned-class" }]);
    } finally {
      classRepository.findTeacherClassIds = originals.findTeacherClassIds;
      classRepository.findAllClasses = originals.findAllClasses;
    }
  });

  await t.test("an assigned class teacher can open their roster without a global classes permission", async () => {
    const originals = {
      findClassById: classRepository.findClassById,
      findTeacherAssignment: classRepository.findTeacherAssignment,
      findStudents: classRepository.findStudents
    };
    classRepository.findClassById = async () => ({ id: "assigned-class" });
    classRepository.findTeacherAssignment = async (userId, classId, schoolId) => {
      assert.equal(userId, "teacher-user");
      assert.equal(classId, "assigned-class");
      assert.equal(schoolId, "school-1");
      return { id: "active-class-teacher-assignment" };
    };
    classRepository.findStudents = async () => [];

    try {
      assert.deepEqual(await classService.getStudents("assigned-class", {
        userId: "teacher-user",
        schoolId: "school-1",
        role: "CLASS_TEACHER"
      }), []);
    } finally {
      classRepository.findClassById = originals.findClassById;
      classRepository.findTeacherAssignment = originals.findTeacherAssignment;
      classRepository.findStudents = originals.findStudents;
    }
  });

  await t.test("a teacher cannot open an unassigned class roster", async () => {
    const originals = {
      findClassById: classRepository.findClassById,
      findTeacherAssignment: classRepository.findTeacherAssignment,
      findStudents: classRepository.findStudents
    };
    classRepository.findClassById = async () => ({ id: "other-class" });
    classRepository.findTeacherAssignment = async () => null;
    classRepository.findStudents = async () => {
      assert.fail("An unauthorized roster must not be queried");
    };

    try {
      await assert.rejects(
        classService.getStudents("other-class", {
          userId: "teacher-user",
          schoolId: "school-1",
          role: "CLASS_TEACHER"
        }),
        (error) => error.code === "TEACHER_ASSIGNMENT_REQUIRED" && error.statusCode === 403
      );
    } finally {
      classRepository.findClassById = originals.findClassById;
      classRepository.findTeacherAssignment = originals.findTeacherAssignment;
      classRepository.findStudents = originals.findStudents;
    }
  });

  await t.test("read middleware permits only assigned class and student records", async () => {
    const originals = {
      userPermission: prisma.userPermission.findFirst,
      roleAssignments: prisma.userRoleAssignment.findMany,
      role: prisma.role.findUnique,
      rolePermission: prisma.rolePermission.findFirst,
      assignedClasses: classRepository.findTeacherClassIds,
      student: prisma.student.findUnique
    };
    prisma.userPermission.findFirst = async () => null;
    prisma.userRoleAssignment.findMany = async () => [];
    prisma.role.findUnique = async () => null;
    prisma.rolePermission.findFirst = async () => null;
    classRepository.findTeacherClassIds = async () => ["assigned-class"];
    prisma.student.findUnique = async () => ({
      currentClassId: "assigned-class",
      enrollments: []
    });
    const teacher = { userId: "teacher-user", schoolId: "school-1", role: "CLASS_TEACHER" };

    try {
      assert.equal(await hasPermission(teacher, "classes:view", {
        method: "GET",
        originalUrl: "/api/classes/assigned-class/students"
      }), true);
      assert.equal(await hasPermission(teacher, "classes:view", {
        method: "GET",
        originalUrl: "/api/classes/other-class/students"
      }), false);
      assert.equal(await hasPermission(teacher, "students:view", {
        method: "GET",
        originalUrl: "/api/students/student-id"
      }), true);
      prisma.student.findUnique = async () => ({ currentClassId: "other-class", enrollments: [] });
      assert.equal(await hasPermission(teacher, "students:view", {
        method: "GET",
        originalUrl: "/api/students/student-id"
      }), false);
    } finally {
      prisma.userPermission.findFirst = originals.userPermission;
      prisma.userRoleAssignment.findMany = originals.roleAssignments;
      prisma.role.findUnique = originals.role;
      prisma.rolePermission.findFirst = originals.rolePermission;
      classRepository.findTeacherClassIds = originals.assignedClasses;
      prisma.student.findUnique = originals.student;
    }
  });
});
