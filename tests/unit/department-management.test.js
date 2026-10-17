const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/departments/department.repository");
const service = require("../../src/modules/departments/department.service");

test("departments cannot be deleted while academic records depend on them", async () => {
  const originals = {
    findDepartmentById: repository.findDepartmentById,
    findDepartmentUsage: repository.findDepartmentUsage,
    deleteDepartment: repository.deleteDepartment,
  };
  repository.findDepartmentById = async () => ({ id: "department-id" });
  repository.findDepartmentUsage = async () => ({
    _count: { subjectTargets: 1, subjects: 0, staff: 0, enrollments: 0 },
  });
  repository.deleteDepartment = async () => assert.fail("A department with linked records must not be deleted");

  try {
    await assert.rejects(
      service.deleteDepartment("department-id"),
      (error) => error.code === "DEPARTMENT_ALREADY_IN_USE" && error.statusCode === 409
    );
  } finally {
    Object.assign(repository, originals);
  }
});

test("unused departments can be deleted by administrators", async () => {
  const originals = {
    findDepartmentById: repository.findDepartmentById,
    findDepartmentUsage: repository.findDepartmentUsage,
    deleteDepartment: repository.deleteDepartment,
  };
  const department = { id: "department-id" };
  repository.findDepartmentById = async () => department;
  repository.findDepartmentUsage = async () => ({
    _count: {
      subjects: 0,
      subjectTargets: 0,
      staff: 0,
      enrollments: 0,
      studentApplicants: 0,
      studentDepartmentSelections: 0,
      admissionApplicants: 0,
    },
  });
  repository.deleteDepartment = async () => department;

  try {
    assert.equal(await service.deleteDepartment("department-id"), department);
  } finally {
    Object.assign(repository, originals);
  }
});
