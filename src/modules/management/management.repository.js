const { prisma } = require("../../config/database");

const count = (model, where) => prisma[model].count({ where });

const dashboard = async () => {
	const [
		totalStudents,
		totalTeachers,
		staff,
		parents,
		paymentsAgg,
		feesAgg,
		attendanceByStatus,
		resultsAgg,
	] = await Promise.all([
		count("student", { status: "ACTIVE" }),
		count("staff", { user: { role: "TEACHER" }, status: "ACTIVE" }),
		count("staff", { status: "ACTIVE" }),
		count("parent", {}),
		prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
		prisma.studentFeeAccount.aggregate({ _sum: { balance: true } }),
		prisma.studentAttendance.groupBy({ by: ["status"], _count: { _all: true } }),
		prisma.result.aggregate({ _avg: { percentage: true } }),
	]);

	const present = attendanceByStatus.find((a) => a.status === "PRESENT")?._count?._all || 0;
	const totalAtt = attendanceByStatus.reduce((acc, a) => acc + a._count._all, 0) || 1;
	const averageAttendance = Math.round((present / totalAtt) * 1000) / 10;
	const averagePerformance = resultsAgg._avg.percentage ? Math.round(Number(resultsAgg._avg.percentage) * 10) / 10 : 75.0;

	return {
		totalStudents,
		students: totalStudents,
		totalTeachers,
		teachers: totalTeachers,
		staff,
		parents,
		averageAttendance,
		averagePerformance,
		totalRevenue: Number(paymentsAgg._sum.amount || 0),
		outstandingFees: Number(feesAgg._sum.balance || 0),
	};
};

module.exports = { dashboard };

