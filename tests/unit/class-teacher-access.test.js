const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const classRepository = require("../../src/modules/classes/class.repository");
const classService = require("../../src/modules/classes/class.service");
const studentRepository = require("../../src/modules/students/student.repository");
const studentService = require("../../src/modules/students/student.service");
const teacherService = require("../../src/modules/teachers/teacher.service");
const teacherRepository = require("../../src/modules/teachers/teacher.repository");
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

      test("school admins can manage subject and department records", async () => {
        const admin = { userId: "school-admin", role: "ADMIN" };
        assert.equal(await hasPermission(admin, "subjects:delete", {}), true);
        assert.equal(await hasPermission(admin, "departments:delete", {}), true);
      });

      test("class teachers can read the active session and its terms", async () => {
        const originals = {
          userPermission: prisma.userPermission.findFirst,
          roleAssignments: prisma.userRoleAssignment.findMany,
          role: prisma.role.findUnique,
          rolePermission: prisma.rolePermission.findFirst,
          session: prisma.academicSession.findFirst,
        };
        prisma.userPermission.findFirst = async () => null;
        prisma.userRoleAssignment.findMany = async () => [];
        prisma.role.findUnique = async () => null;
        prisma.rolePermission.findFirst = async () => null;
        prisma.academicSession.findFirst = async ({ where }) => where.id === "active-session"
          ? { id: where.id }
          : null;
        const teacher = { userId: "teacher-user", schoolId: "school-1", role: "CLASS_TEACHER" };

        try {
          assert.equal(await hasPermission(teacher, "academic_sessions:view", {
            method: "GET",
            originalUrl: "/api/v1/academic-sessions/current",
          }), true);
          assert.equal(await hasPermission(teacher, "terms:view", {
            method: "GET",
            originalUrl: "/api/v1/terms/sessions/active-session",
          }), true);
          assert.equal(await hasPermission(teacher, "terms:view", {
            method: "GET",
            originalUrl: "/api/v1/terms/sessions/closed-session",
          }), false);
        } finally {
          prisma.userPermission.findFirst = originals.userPermission;
          prisma.userRoleAssignment.findMany = originals.roleAssignments;
          prisma.role.findUnique = originals.role;
          prisma.rolePermission.findFirst = originals.rolePermission;
          prisma.academicSession.findFirst = originals.session;
        }
      });
      assert.deepEqual(receivedClassIds, ["assigned-class"]);
      assert.deepEqual(classes, [{ id: "assigned-class" }]);
    } finally {
      classRepository.findTeacherClassIds = originals.findTeacherClassIds;
      classRepository.findAllClasses = originals.findAllClasses;
    }
  });

  await t.test("teacher profiles retain class-teacher assignments for the roster UI", async () => {
    const original = teacherRepository.findByUserId;
    teacherRepository.findByUserId = async () => ({
      id: "teacher-profile",
      profileImageUrl: null,
      user: { id: "teacher-user" },
      teacherAssignments: [],
      classTeacherAssignments: [{ id: "cta-1", sessionId: "session-1", classId: "assigned-class", class: { id: "assigned-class", name: "JSS1 Blue" } }],
    });

    try {
      const teacher = await teacherService.getCurrent("teacher-user");
      assert.deepEqual(teacher.classTeacherAssignments.map((assignment) => assignment.classId), ["assigned-class"]);
      assert.equal(teacher.classTeacherAssignments[0].session, null);
    } finally {
      teacherRepository.findByUserId = original;
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

  await t.test("class teacher student lookups retain the class-teacher assignment scope", async () => {
    const originals = {
      findTeacherClassIds: studentRepository.findTeacherClassIds,
      findAll: studentRepository.findAll
    };
    let filters;
    studentRepository.findTeacherClassIds = async (userId, schoolId, role) => {
      assert.equal(userId, "teacher-user");
      assert.equal(schoolId, "school-1");
      assert.equal(role, "CLASS_TEACHER");
      return ["assigned-class"];
    };
    studentRepository.findAll = async (query) => {
      filters = query;
      return [];
    };

    try {
      await studentService.getAllStudents({}, {
        userId: "teacher-user",
        schoolId: "school-1",
        role: "CLASS_TEACHER"
      });
      assert.deepEqual(filters.classIds, ["assigned-class"]);
      assert.equal(filters.classId, undefined);
    } finally {
      studentRepository.findTeacherClassIds = originals.findTeacherClassIds;
      studentRepository.findAll = originals.findAll;
    }
  });

  await t.test("class teacher search cannot widen results beyond assigned classes", async () => {
    const originals = {
      findTeacherClassIds: studentRepository.findTeacherClassIds,
      findAll: studentRepository.findAll
    };
    const receivedFilters = [];
    studentRepository.findTeacherClassIds = async () => ["assigned-class"];
    studentRepository.findAll = async (filters) => {
      receivedFilters.push(filters);
      return [];
    };

    try {
      const teacher = { userId: "teacher-user", schoolId: "school-1", role: "CLASS_TEACHER" };
      await studentService.getAllStudents({ classId: "unassigned-class", search: "  Amina  " }, teacher);
      await studentService.getAllStudents({ classId: "assigned-class", search: "  Amina  " }, teacher);

      assert.deepEqual(receivedFilters.map(({ classIds }) => classIds), [[], ["assigned-class"]]);
      assert.deepEqual(receivedFilters.map(({ search }) => search), ["Amina", "Amina"]);
      assert.equal(receivedFilters[0].classId, undefined);
    } finally {
      studentRepository.findTeacherClassIds = originals.findTeacherClassIds;
      studentRepository.findAll = originals.findAll;
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

  await t.test("teaching roles can open only the teacher dashboard without a module grant", async () => {
    const originals = {
      userPermission: prisma.userPermission.findFirst,
      roleAssignments: prisma.userRoleAssignment.findMany,
      role: prisma.role.findUnique,
      rolePermission: prisma.rolePermission.findFirst
    };
    prisma.userPermission.findFirst = async () => null;
    prisma.userRoleAssignment.findMany = async () => [];
    prisma.role.findUnique = async () => null;
    prisma.rolePermission.findFirst = async () => null;

    try {
      assert.equal(await hasPermission(
        { userId: "teacher-user", role: "CLASS_TEACHER" },
        "dashboards:view",
        { method: "GET", originalUrl: "/api/dashboard/teacher" }
      ), true);
      assert.equal(await hasPermission(
        { userId: "teacher-user", role: "CLASS_TEACHER" },
        "dashboards:view",
        { method: "GET", originalUrl: "/api/dashboard/teacher/activity" }
      ), true);
      assert.equal(await hasPermission(
        { userId: "teacher-user", role: "CLASS_TEACHER" },
        "dashboards:view",
        { method: "GET", originalUrl: "/api/dashboard/teacher/other" }
      ), false);
      assert.equal(await hasPermission(
        { userId: "teacher-user", role: "CLASS_TEACHER" },
        "dashboards:view",
        { method: "GET", originalUrl: "/api/dashboard/student" }
      ), false);
      assert.equal(await hasPermission(
        { userId: "teacher-user", role: "STUDENT" },
        "dashboards:view",
        { method: "GET", originalUrl: "/api/dashboard/teacher" }
      ), false);
    } finally {
      prisma.userPermission.findFirst = originals.userPermission;
      prisma.userRoleAssignment.findMany = originals.roleAssignments;
      prisma.role.findUnique = originals.role;
      prisma.rolePermission.findFirst = originals.rolePermission;
    }
  });

  await t.test("users can read only their own profile and result entry points", async () => {
    const originals = {
      userPermission: prisma.userPermission.findFirst,
      roleAssignments: prisma.userRoleAssignment.findMany,
      role: prisma.role.findUnique,
      rolePermission: prisma.rolePermission.findFirst
    };
    prisma.userPermission.findFirst = async () => null;
    prisma.userRoleAssignment.findMany = async () => [];
    prisma.role.findUnique = async () => null;
    prisma.rolePermission.findFirst = async () => null;

    try {
      const student = { userId: "student-user", role: "STUDENT" };
      const teacher = { userId: "teacher-user", role: "CLASS_TEACHER" };
      assert.equal(await hasPermission(student, "students:view", {
        method: "GET", originalUrl: "/api/students/me"
      }), true);
      assert.equal(await hasPermission(student, "students:view", {
        method: "GET", originalUrl: "/api/students/another-student"
      }), false);
      assert.equal(await hasPermission(teacher, "teachers:view", {
        method: "GET", originalUrl: "/api/teachers/me"
      }), true);
      assert.equal(await hasPermission(teacher, "teachers:view", {
        method: "GET", originalUrl: "/api/teachers/me/assignments"
      }), true);
      assert.equal(await hasPermission(student, "teachers:view", {
        method: "GET", originalUrl: "/api/teachers/me"
      }), false);
      assert.equal(await hasPermission(teacher, "teachers:view", {
        method: "GET", originalUrl: "/api/teachers/another-teacher/assignments"
      }), false);
      assert.equal(await hasPermission(student, "results:view", {
        method: "GET", originalUrl: "/api/results/mine"
      }), true);
      assert.equal(await hasPermission(student, "results:view", {
        method: "GET", originalUrl: "/api/results/another-result"
      }), false);
      assert.equal(await hasPermission(student, "report_cards:view", {
        method: "GET", originalUrl: "/api/report-cards"
      }), true);
      assert.equal(await hasPermission(student, "report_cards:view", {
        method: "POST", originalUrl: "/api/report-cards"
      }), false);
      assert.equal(await hasPermission(teacher, "results:view", {
        method: "GET", originalUrl: "/api/results/teacher"
      }), true);
      assert.equal(await hasPermission(teacher, "results:view", {
        method: "GET", originalUrl: "/api/v1/results/term-entry"
      }), true);
      assert.equal(await hasPermission(teacher, "results:edit", {
        method: "PUT", originalUrl: "/api/results/term-entry/batch"
      }), true);
      assert.equal(await hasPermission(teacher, "report_cards:edit", {
        method: "PUT", originalUrl: "/api/report-cards/entries/batch"
      }), true);
      assert.equal(await hasPermission(teacher, "report_cards:edit", {
        method: "POST", originalUrl: "/api/report-cards"
      }), false);
    } finally {
      prisma.userPermission.findFirst = originals.userPermission;
      prisma.userRoleAssignment.findMany = originals.roleAssignments;
      prisma.role.findUnique = originals.role;
      prisma.rolePermission.findFirst = originals.rolePermission;
    }
  });

  await t.test("teachers can read only their own assignments and subjects for assigned classes", async () => {
    const originals = {
      userPermission: prisma.userPermission.findFirst,
      roleAssignments: prisma.userRoleAssignment.findMany,
      role: prisma.role.findUnique,
      rolePermission: prisma.rolePermission.findFirst,
      assignedClasses: classRepository.findTeacherClassIds
    };
    prisma.userPermission.findFirst = async () => null;
    prisma.userRoleAssignment.findMany = async () => [];
    prisma.role.findUnique = async () => null;
    prisma.rolePermission.findFirst = async () => null;
    classRepository.findTeacherClassIds = async (userId, schoolId, role) => {
      assert.equal(userId, "teacher-user");
      assert.equal(schoolId, "school-1");
      assert.equal(role, "CLASS_TEACHER");
      return ["assigned-class"];
    };
    const teacher = { userId: "teacher-user", schoolId: "school-1", role: "CLASS_TEACHER" };

    try {
      assert.equal(await hasPermission(teacher, "teacher_assignments:view", {
        method: "GET", originalUrl: "/api/teacher-assignments"
      }), true);
      assert.equal(await hasPermission(teacher, "teacher_assignments:view", {
        method: "GET", originalUrl: "/api/teacher-assignments/class-teachers"
      }), true);
      assert.equal(await hasPermission(teacher, "teacher_assignments:view", {
        method: "POST", originalUrl: "/api/teacher-assignments"
      }), false);
      assert.equal(await hasPermission(teacher, "class_subjects:view", {
        method: "GET", originalUrl: "/api/class-subjects", query: { classId: "assigned-class" }
      }), true);
      assert.equal(await hasPermission(teacher, "class_subjects:view", {
        method: "GET", originalUrl: "/api/class-subjects", query: { classId: "other-class" }
      }), false);
      assert.equal(await hasPermission(teacher, "class_subjects:view", {
        method: "GET", originalUrl: "/api/class-subjects"
      }), false);
    } finally {
      prisma.userPermission.findFirst = originals.userPermission;
      prisma.userRoleAssignment.findMany = originals.roleAssignments;
      prisma.role.findUnique = originals.role;
      prisma.rolePermission.findFirst = originals.rolePermission;
      classRepository.findTeacherClassIds = originals.assignedClasses;
    }
  });
});
