const { prisma } = require("../../config/database");
const findStudents = (where) => prisma.student.findMany({
	where,
	include: {
		currentClass: { include: { classLevel: true } },
		results: {
			where: { published: true, ...(where?.user?.schoolId ? { session: { schoolId: where.user.schoolId } } : {}) },
			include: { exam: { include: { subject: true, class: { include: { classLevel: true } } } }, session: true, term: true },
			orderBy: { generatedAt: "asc" }
		}
	},
	orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
});
module.exports = { findStudents };