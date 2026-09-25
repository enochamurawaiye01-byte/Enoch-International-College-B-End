const { prisma } = require("../../config/database");

const dashboard = async (query) => {
	const studentWhere = { ...(query.sessionId ? { currentSessionId: query.sessionId } : {}) };
	const attendanceWhere = { ...(query.termId ? { termId: query.termId } : {}), ...(query.from || query.to ? { date: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) };

	const [
		totalStudents,
		totalTeachers,
		totalParents,
		totalClasses,
		activeSessionObj,
		activeTermObj,
		feesAgg,
		paymentsAgg,
		attendanceByStatus,
	] = await Promise.all([
		prisma.student.count({ where: studentWhere }),
		prisma.staff.count({ where: { status: "ACTIVE", user: { role: "TEACHER" } } }),
		prisma.parent.count(),
		prisma.class.count({ where: { isActive: true } }),
		prisma.academicSession.findFirst({ where: { isActive: true } }),
		prisma.term.findFirst({ where: { isActive: true }, include: { session: true } }),
		prisma.studentFeeAccount.aggregate({ _sum: { balance: true } }),
		prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
		prisma.studentAttendance.groupBy({ by: ["status"], where: attendanceWhere, _count: { _all: true } }),
	]);

	const present = attendanceByStatus.find((a) => a.status === "PRESENT")?._count?._all || 0;
	const totalAtt = attendanceByStatus.reduce((acc, a) => acc + a._count._all, 0) || 1;
	const attendanceRate = Math.round((present / totalAtt) * 1000) / 10;

	return {
		totalStudents,
		totalTeachers,
		teachers: totalTeachers,
		totalParents,
		parents: totalParents,
		totalClasses,
		activeSession: activeSessionObj ? activeSessionObj.name : "None",
		currentTerm: activeTermObj ? `${activeTermObj.name} Term` : "None",
		totalRevenue: Number(paymentsAgg._sum.amount || 0),
		outstandingFees: Number(feesAgg._sum.balance || 0),
		attendanceRate,
	};
};

module.exports = { dashboard };

