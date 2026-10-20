const { prisma } = require("../../config/database");
const { TEACHING_ROLES } = require("../../core/utils/teaching-roles");

const findStaffById = (id) => prisma.staff.findUnique({
	where: { id },
	include: {
		user: {
			select: {
				id: true,
				status: true,
				role: true,
				roleAssignments: {
					where: { status: "ACTIVE" },
					select: { role: { select: { name: true, isActive: true } } }
				}
			}
		}
	},
});
const findClassTeacherCandidates = () => prisma.staff.findMany({
	where: { status: "ACTIVE", user: { status: "ACTIVE" } },
	select: {
		id: true,
		firstName: true,
		lastName: true,
		user: { select: { fullName: true } }
	},
	orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
});
const findStaffByUserId = (userId) => prisma.staff.findUnique({ where: { userId }, select: { id: true } });
const findClassById = (id) => prisma.class.findUnique({ where: { id } });
const findClassesWithSubject = (subjectId, classLevel) => prisma.classSubject.findMany({
	where: {
		subjectId,
		class: {
			isActive: true,
			classLevel: classLevel === "BOTH"
				? { OR: [{ code: { startsWith: "JSS" } }, { code: { startsWith: "SS" } }] }
				: { code: { startsWith: classLevel === "SSS" ? "SS" : "JSS" } }
		}
	},
	select: { class: { include: { classLevel: true } } },
	orderBy: [{ class: { classLevel: { code: "asc" } } }, { class: { name: "asc" } }]
});
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findClassTeacherRole = () => prisma.role.findUnique({ where: { name: "CLASS_TEACHER" } });
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findSubjectById = (id) => prisma.subject.findUnique({ where: { id } });
const findClassSubject = (classId, subjectId) => prisma.classSubject.findUnique({ where: { classId_subjectId: { classId, subjectId } } });

const findDuplicate = (data) => prisma.teacherAssignment.findFirst({
	where: {
		classId: data.classId,
		subjectId: data.subjectId,
		staffId: data.staffId,
		sessionId: data.sessionId,
		termId: data.termId,
	},
});
const create = (data) => prisma.teacherAssignment.create({ data, include: { staff: true, subject: true, class: { include: { classLevel: true } } } });
const createForClasses = async (assignments) => prisma.$transaction(async (tx) => {
	const result = await tx.teacherAssignment.createMany({ data: assignments, skipDuplicates: true });
	const rows = await tx.teacherAssignment.findMany({
		where: {
			staffId: assignments[0].staffId,
			subjectId: assignments[0].subjectId,
			classId: { in: assignments.map((assignment) => assignment.classId) },
			sessionId: assignments[0].sessionId,
			termId: assignments[0].termId
		},
		include: { staff: true, subject: true, class: { include: { classLevel: true } } }
	});
	return { count: result.count, assignments: rows, createdCount: result.count };
});
const findAll = (filters) => prisma.teacherAssignment.findMany({ where: filters, include: { staff: true, subject: true, class: { include: { classLevel: true } } }, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.teacherAssignment.findUnique({ where: { id }, include: { staff: true, subject: true, class: { include: { classLevel: true } } } });
const remove = (id) => prisma.teacherAssignment.delete({ where: { id } });

const findClassTeacherAssignment = (id) => prisma.classTeacherAssignment.findUnique({
	where: { id },
	include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true }
});
const findClassTeacherAssignments = (filters) => prisma.classTeacherAssignment.findMany({
	where: filters,
	include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true },
	orderBy: [{ session: { startDate: "desc" } }, { class: { name: "asc" } }]
});
const findClassTeacherAssignmentByClassSession = (classId, sessionId) => prisma.classTeacherAssignment.findUnique({ where: { classId_sessionId: { classId, sessionId } } });
const activateClassTeacherRole = async (tx, userId, assignedById, previousPrimaryRole) => {
	const now = new Date();
	const classTeacherRole = await tx.role.findUnique({ where: { name: "CLASS_TEACHER" } });
	if (!classTeacherRole?.isActive) {
		const error = new Error("The CLASS_TEACHER role is missing or inactive. Activate it in role management first.");
		error.code = "CLASS_TEACHER_ROLE_NOT_CONFIGURED";
		throw error;
	}
	await tx.userRoleAssignment.upsert({
		where: { userId_roleId: { userId, roleId: classTeacherRole.id } },
		update: {
			status: "ACTIVE",
			assignedBy: assignedById || null,
			activatedBy: assignedById || null,
			activatedAt: now,
			activationToken: null,
			activationExpiresAt: null,
			removedAt: null,
			assignedAt: now
		},
		create: {
			userId,
			roleId: classTeacherRole.id,
			status: "ACTIVE",
			assignedBy: assignedById || null,
			activatedBy: assignedById || null,
			activatedAt: now
		}
	});

	if (previousPrimaryRole && previousPrimaryRole !== "CLASS_TEACHER" && TEACHING_ROLES.has(previousPrimaryRole)) {
		const previousRole = await tx.role.findUnique({ where: { name: previousPrimaryRole } });
		if (previousRole?.isActive) {
			await tx.userRoleAssignment.upsert({
				where: { userId_roleId: { userId, roleId: previousRole.id } },
				update: {
					status: "ACTIVE",
					assignedBy: assignedById || null,
					activatedBy: assignedById || null,
					activatedAt: now,
					activationToken: null,
					activationExpiresAt: null,
					removedAt: null
				},
				create: {
					userId,
					roleId: previousRole.id,
					status: "ACTIVE",
					assignedBy: assignedById || null,
					activatedBy: assignedById || null,
					activatedAt: now
				}
			});
		}
	}
};
const ensureClassTeacherRole = async (userId, assignedById, previousPrimaryRole) => prisma.$transaction(async (tx) => {
	await activateClassTeacherRole(tx, userId, assignedById, previousPrimaryRole);
	await tx.user.update({ where: { id: userId }, data: { role: "CLASS_TEACHER" } });
	await tx.userSession.deleteMany({ where: { userId } });
});
const saveClassTeacherAssignment = (data) => prisma.$transaction(async (tx) => {
	const assignment = await tx.classTeacherAssignment.create({
		data,
		include: { staff: { include: { user: true } }, class: { include: { classLevel: true } }, session: true }
	});
	await activateClassTeacherRole(tx, assignment.staff.userId, data.assignedById, assignment.staff.user.role);
	await tx.user.update({
		where: { id: assignment.staff.userId },
		data: { role: "CLASS_TEACHER" }
	});
	await tx.userSession.deleteMany({ where: { userId: assignment.staff.userId } });
	return assignment;
});
const removeClassTeacherAssignment = (id) => prisma.$transaction(async (tx) => {
	const assignment = await tx.classTeacherAssignment.findUnique({
		where: { id },
		select: { staffId: true, staff: { select: { userId: true } } }
	});
	if (!assignment) return null;

	await tx.classTeacherAssignment.delete({ where: { id } });
	const remainingAssignments = await tx.classTeacherAssignment.count({
		where: { staffId: assignment.staffId }
	});
	if (remainingAssignments === 0) {
		const classTeacherRole = await tx.role.findUnique({ where: { name: "CLASS_TEACHER" } });
		if (classTeacherRole) {
			await tx.userRoleAssignment.updateMany({
				where: { userId: assignment.staff.userId, roleId: classTeacherRole.id, status: { in: ["ACTIVE", "PENDING"] } },
				data: { status: "REMOVED", removedAt: new Date(), activationToken: null, activationExpiresAt: null }
			});
		}
		const user = await tx.user.findUnique({
			where: { id: assignment.staff.userId },
			select: {
				role: true,
				roleAssignments: {
					where: { status: "ACTIVE", role: { isActive: true, name: { in: [...TEACHING_ROLES] } } },
					include: { role: { select: { name: true } } },
					orderBy: { assignedAt: "asc" }
				}
			}
		});
		if (user?.role === "CLASS_TEACHER") {
			const nextRole = user.roleAssignments.find(({ role }) => role.name !== "CLASS_TEACHER")?.role.name || "STAFF";
			await tx.user.update({ where: { id: assignment.staff.userId }, data: { role: nextRole } });
		}
		await tx.userSession.deleteMany({ where: { userId: assignment.staff.userId } });
	}
	return assignment;
});

module.exports = {
	findStaffById, findClassTeacherCandidates, findStaffByUserId, findSession, findClassTeacherRole, findTerm, findClassById, findClassesWithSubject, findSubjectById, findClassSubject, findDuplicate, create, createForClasses, findAll, findById, remove,
	findClassTeacherAssignment, findClassTeacherAssignments, findClassTeacherAssignmentByClassSession,
	ensureClassTeacherRole, saveClassTeacherAssignment, removeClassTeacherAssignment
};