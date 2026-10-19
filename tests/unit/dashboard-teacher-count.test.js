const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const { TEACHING_ROLES } = require("../../src/core/utils/teaching-roles");
const analyticsRepository = require("../../src/modules/analytics/analytics.repository");
const managementRepository = require("../../src/modules/management/management.repository");

test("dashboards count active staff across all teaching roles from database results", async () => {
  const originals = {
    studentCount: prisma.student.count,
    staffCount: prisma.staff.count,
    parentCount: prisma.parent.count,
    classCount: prisma.class.count,
    sessionFindFirst: prisma.academicSession.findFirst,
    termFindFirst: prisma.term.findFirst,
    feeAggregate: prisma.studentFeeAccount.aggregate,
    paymentAggregate: prisma.payment.aggregate,
    attendanceGroupBy: prisma.studentAttendance.groupBy,
    resultAggregate: prisma.result.aggregate,
  };
  const teacherQueries = [];

  prisma.student.count = async () => 12;
  prisma.staff.count = async ({ where }) => {
    teacherQueries.push(where);
    return 4;
  };
  prisma.parent.count = async () => 3;
  prisma.class.count = async () => 5;
  prisma.academicSession.findFirst = async () => ({ name: "2026/2027" });
  prisma.term.findFirst = async () => ({ name: "FIRST" });
  prisma.studentFeeAccount.aggregate = async () => ({ _sum: { balance: 0 } });
  prisma.payment.aggregate = async () => ({ _sum: { amount: 0 } });
  prisma.studentAttendance.groupBy = async () => [];
  prisma.result.aggregate = async () => ({ _avg: { percentage: null } });

  try {
    const analyticsDashboard = await analyticsRepository.dashboard({});
    const managementDashboard = await managementRepository.dashboard();

    assert.equal(analyticsDashboard.totalTeachers, 4);
    assert.equal(analyticsDashboard.teachers, 4);
    assert.equal(managementDashboard.totalTeachers, 4);
    assert.equal(managementDashboard.teachers, 4);
    assert.equal(managementDashboard.averagePerformance, null);
    const teacherCountQueries = teacherQueries.filter((where) => where.user?.role);
    assert.equal(teacherCountQueries.length, 2);
    teacherCountQueries.forEach((where) => {
      assert.equal(where.status, "ACTIVE");
      assert.deepEqual(where.user.role.in, [...TEACHING_ROLES]);
    });
  } finally {
    prisma.student.count = originals.studentCount;
    prisma.staff.count = originals.staffCount;
    prisma.parent.count = originals.parentCount;
    prisma.class.count = originals.classCount;
    prisma.academicSession.findFirst = originals.sessionFindFirst;
    prisma.term.findFirst = originals.termFindFirst;
    prisma.studentFeeAccount.aggregate = originals.feeAggregate;
    prisma.payment.aggregate = originals.paymentAggregate;
    prisma.studentAttendance.groupBy = originals.attendanceGroupBy;
    prisma.result.aggregate = originals.resultAggregate;
  }
});
