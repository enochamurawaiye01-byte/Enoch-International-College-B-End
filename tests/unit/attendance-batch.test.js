const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const repository = require("../../src/modules/attendance/attendance.repository");

test("batch attendance saves create new records and update existing daily records", async () => {
  const originalTransaction = prisma.$transaction;
  const upserts = [];
  const expectedResults = [{ id: "attendance-1" }, { id: "attendance-2" }];
  prisma.$transaction = async (callback) => callback({
    studentAttendance: {
      upsert: async (args) => {
        upserts.push(args);
        return args.create;
      },
      findMany: async () => expectedResults,
    },
  });

  const date = new Date("2026-10-20T00:00:00.000Z");
  const records = [
    { studentId: "student-1", classId: "class-1", sessionId: "session-1", termId: "term-1", date, status: "PRESENT", remarks: null },
    { studentId: "student-2", classId: "class-1", sessionId: "session-1", termId: "term-1", date, status: "ABSENT", remarks: "Sick" },
  ];

  try {
    const result = await repository.saveMany(records);
    assert.deepEqual(result, expectedResults);
    assert.equal(upserts.length, 2);
    assert.deepEqual(upserts.map(({ where }) => where.studentId_date.studentId), ["student-1", "student-2"]);
    assert.equal(upserts[0].create.status, "PRESENT");
    assert.equal(upserts[0].update.status, "PRESENT");
    assert.equal(upserts[1].create.status, "ABSENT");
    assert.equal(upserts[1].update.remarks, "Sick");
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
