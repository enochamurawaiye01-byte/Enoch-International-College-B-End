const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const studentRepository = require("../../src/modules/students/student.repository");
const classRepository = require("../../src/modules/classes/class.repository");
const resultRepository = require("../../src/modules/results/result.repository");
const studentService = require("../../src/modules/students/student.service");
const resultService = require("../../src/modules/results/result.service");

test("a class teacher cannot retrieve a student outside assigned classes by ID", async () => {
	const originalFindById = studentRepository.findById;
	const originalFindTeacherClassIds = classRepository.findTeacherClassIds;
	studentRepository.findById = async () => ({
		id: "student-jss2",
		userId: "student-user",
		currentClassId: "class-jss2",
		user: { schoolId: "school-1" },
		enrollments: [{ classId: "class-jss2", status: "ACTIVE", session: { isActive: true } }],
		reportCards: []
	});
	classRepository.findTeacherClassIds = async () => ["class-jss1"];
	try {
		await assert.rejects(
			studentService.getStudentById("student-jss2", {
				userId: "teacher-1",
				schoolId: "school-1",
				role: "CLASS_TEACHER"
			}),
			(error) => error.code === "TEACHER_ASSIGNMENT_REQUIRED"
		);
	} finally {
		studentRepository.findById = originalFindById;
		classRepository.findTeacherClassIds = originalFindTeacherClassIds;
	}
});

test("a JSS1 class teacher cannot read or edit a JSS2 result or a result from another session", async () => {
	const originals = {
		findById: resultRepository.findById,
		update: resultRepository.update,
		staffFindUnique: prisma.staff.findUnique,
		teacherAssignmentFindFirst: prisma.teacherAssignment.findFirst,
		classTeacherAssignmentFindMany: prisma.classTeacherAssignment.findMany
	};
	const result = {
		id: "result-1",
		student: { userId: "student-user", user: { schoolId: "school-1" } },
		exam: { classId: "class-jss2", subjectId: "subject-1" },
		sessionId: "old-session",
		termId: "term-1"
	};
	let classTeacherFilter;
	let resultWriteCount = 0;
	resultRepository.findById = async () => result;
	resultRepository.update = async () => { resultWriteCount += 1; return result; };
	prisma.staff.findUnique = async () => ({ id: "staff-1" });
	prisma.teacherAssignment.findFirst = async () => null;
	prisma.classTeacherAssignment.findMany = async ({ where }) => {
		classTeacherFilter = where;
		return [];
	};
	try {
		await assert.rejects(
			resultService.getById("result-1", {
				userId: "teacher-1",
				schoolId: "school-1",
				role: "CLASS_TEACHER"
			}),
			(error) => error.code === "RESULT_ACCESS_DENIED"
		);
		await assert.rejects(
			resultService.updateResult("result-1", { score: 95 }, {
				userId: "teacher-1",
				schoolId: "school-1",
				role: "CLASS_TEACHER"
			}),
			(error) => error.code === "RESULT_ACCESS_DENIED"
		);
		assert.equal(classTeacherFilter.staffId, "staff-1");
		assert.equal(classTeacherFilter.session.isActive, true);
		assert.equal(classTeacherFilter.classId, undefined);
		assert.equal(resultWriteCount, 0);
	} finally {
		resultRepository.findById = originals.findById;
		resultRepository.update = originals.update;
		prisma.staff.findUnique = originals.staffFindUnique;
		prisma.teacherAssignment.findFirst = originals.teacherAssignmentFindFirst;
		prisma.classTeacherAssignment.findMany = originals.classTeacherAssignmentFindMany;
	}
});

test("Head Teacher can retrieve school results when granted results:view", async () => {
	const originals = {
		findById: resultRepository.findById,
		userPermissionFindFirst: prisma.userPermission.findFirst,
		roleAssignmentFindMany: prisma.userRoleAssignment.findMany,
		rolePermissionFindFirst: prisma.rolePermission.findFirst
	};
	const result = {
		id: "result-jss2",
		student: { userId: "student-user", user: { schoolId: "school-1" } },
		exam: { classId: "class-jss2" }
	};
	resultRepository.findById = async () => result;
	prisma.userPermission.findFirst = async () => null;
	prisma.userRoleAssignment.findMany = async () => [{
		roleId: "head-teacher-role",
		status: "ACTIVE",
		role: { id: "head-teacher-role", name: "HEAD_TEACHER", isActive: true }
	}];
	prisma.rolePermission.findFirst = async () => ({ roleId: "head-teacher-role" });
	try {
		assert.equal(await resultService.getById("result-jss2", {
			userId: "head-1",
			schoolId: "school-1",
			role: "HEAD_TEACHER"
		}), result);
	} finally {
		resultRepository.findById = originals.findById;
		prisma.userPermission.findFirst = originals.userPermissionFindFirst;
		prisma.userRoleAssignment.findMany = originals.roleAssignmentFindMany;
		prisma.rolePermission.findFirst = originals.rolePermissionFindFirst;
	}
});

test("Super Admin can retrieve a result from any class", async () => {
	const originalFindById = resultRepository.findById;
	const result = { id: "result-jss2", exam: { classId: "class-jss2" } };
	resultRepository.findById = async () => result;
	try {
		assert.equal(await resultService.getById("result-jss2", {
			userId: "admin-1",
			role: "SUPER_ADMIN"
		}), result);
	} finally {
		resultRepository.findById = originalFindById;
	}
});
