const assert = require("node:assert/strict");
const { test } = require("node:test");
const studentRepository = require("../../src/modules/students/student.repository");
const studentService = require("../../src/modules/students/student.service");

test("student academic information is scoped to the student's current class teacher", async (t) => {
  const originalFindCurrentClassTeacher = studentRepository.findCurrentClassTeacher;
  let query;
  studentRepository.findCurrentClassTeacher = async (classId, schoolId) => {
    query = { classId, schoolId };
    return {
      staff: { id: "staff-1", user: { fullName: "Assigned Teacher" } },
      session: { id: "session-1", name: "2026/2027" },
    };
  };
  t.after(() => {
    studentRepository.findCurrentClassTeacher = originalFindCurrentClassTeacher;
  });

  const student = await studentService.enrichCurrentClassTeacher({
    currentClassId: "class-1",
    currentClass: { id: "class-1", name: "JSS2 A" },
    user: { schoolId: "school-1" },
    profileImageUrl: null,
  });

  assert.deepEqual(query, { classId: "class-1", schoolId: "school-1" });
  assert.equal(student.currentClass.classTeacher.fullName, "Assigned Teacher");
  assert.equal(student.currentClass.classTeacher.session.name, "2026/2027");
});

test("student academic information reports when no class teacher is assigned", async (t) => {
  const originalFindCurrentClassTeacher = studentRepository.findCurrentClassTeacher;
  studentRepository.findCurrentClassTeacher = async () => null;
  t.after(() => {
    studentRepository.findCurrentClassTeacher = originalFindCurrentClassTeacher;
  });

  const student = await studentService.enrichCurrentClassTeacher({
    currentClassId: "class-1",
    currentClass: { id: "class-1", name: "JSS2 A" },
    user: { schoolId: "school-1" },
    profileImageUrl: null,
  });

  assert.equal(student.currentClass.classTeacher, null);
});
