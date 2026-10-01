const { prisma } = require("../../config/database");
const { publicUserSelect } = require("./user.utils");
const roleAssignmentsSelect = {
	select: {
		id: true,
		roleId: true,
		status: true,
		activationExpiresAt: true,
		assignedAt: true,
		role: { select: { id: true, name: true, description: true, isActive: true } }
	},
	orderBy: { assignedAt: "asc" }
};
const findById = (id) => prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect, roleAssignments: roleAssignmentsSelect, permissionGrants: { include: { permission: true } } } });
const findByEmail = (email) => prisma.user.findUnique({ where: { email } });
const findAll = (where, skip, take) => prisma.user.findMany({
	where,
	skip,
	take,
	select: {
		...publicUserSelect,
		roleAssignments: roleAssignmentsSelect,
		student: { select: { id: true } }
	},
	orderBy: { createdAt: "desc" }
});
const count = (where) => prisma.user.count({ where });
const create = (data, tx = prisma) => tx.user.create({ data, select: publicUserSelect });
const update = (id, data) => prisma.user.update({ where: { id }, data, select: publicUserSelect });
const remove = (id, tx = prisma) => tx.user.delete({ where: { id } });
const countActiveSuperAdmins = () => prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
module.exports = { findById, findByEmail, findAll, count, create, update, remove, countActiveSuperAdmins };
