const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const repository = require("../../src/modules/students/student.repository");
const service = require("../../src/modules/students/student.service");

test("Super Admin student listing is global, filtered, and paginated", async (t) => {
  await t.test("does not restrict Super Admin results to the account's school", async () => {
    const original = repository.findAll;
    let receivedFilters;
    repository.findAll = async (filters) => {
      receivedFilters = filters;
      return { items: [], meta: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
    };

    try {
      const result = await service.getAllStudents(
        { page: "2", pageSize: "20", classId: "class-1", status: "ACTIVE", search: "  Ada  " },
        { role: "SUPER_ADMIN", schoolId: "school-1" }
      );
      assert.equal(receivedFilters.schoolId, undefined);
      assert.equal(receivedFilters.page, 2);
      assert.equal(receivedFilters.pageSize, 20);
      assert.equal(receivedFilters.classId, "class-1");
      assert.equal(receivedFilters.status, "ACTIVE");
      assert.equal(receivedFilters.search, "Ada");
      assert.deepEqual(result.meta, { page: 2, pageSize: 20, total: 0, totalPages: 0 });
    } finally {
      repository.findAll = original;
    }
  });

  await t.test("keeps school scope for ordinary school administrators", async () => {
    const original = repository.findAll;
    let receivedFilters;
    repository.findAll = async (filters) => {
      receivedFilters = filters;
      return { items: [], meta: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
    };

    try {
      await service.getAllStudents({}, { role: "ADMIN", schoolId: "school-1" });
      assert.equal(receivedFilters.schoolId, "school-1");
      assert.equal(receivedFilters.page, 1);
      assert.equal(receivedFilters.pageSize, 20);
    } finally {
      repository.findAll = original;
    }
  });

  await t.test("applies database filters and returns the matching count", async () => {
    const originalFindMany = prisma.student.findMany;
    const originalCount = prisma.student.count;
    let findManyArgs;
    let countArgs;
    const rows = [{ id: "student-1" }];
    prisma.student.findMany = async (args) => {
      findManyArgs = args;
      return rows;
    };
    prisma.student.count = async (args) => {
      countArgs = args;
      return 21;
    };

    try {
      const result = await repository.findAll({
        schoolId: undefined,
        search: "Ada",
        classId: "class-1",
        status: "ACTIVE",
        page: 2,
        pageSize: 20,
      });
      assert.deepEqual(findManyArgs.where, countArgs.where);
      assert.equal(findManyArgs.where.status, "ACTIVE");
      assert.deepEqual(findManyArgs.where.AND[0].OR, [
        { currentClassId: { in: ["class-1"] } },
        { enrollments: { some: { classId: { in: ["class-1"] }, status: "ACTIVE", session: { isActive: true } } } },
      ]);
      assert.equal(findManyArgs.where.user, undefined);
      assert.equal(findManyArgs.where.AND[1].OR[0].firstName.contains, "Ada");
      assert.equal(findManyArgs.skip, 20);
      assert.equal(findManyArgs.take, 20);
      assert.deepEqual(result.items, rows);
      assert.deepEqual(result.meta, { page: 2, pageSize: 20, total: 21, totalPages: 2 });
    } finally {
      prisma.student.findMany = originalFindMany;
      prisma.student.count = originalCount;
    }
  });
});
