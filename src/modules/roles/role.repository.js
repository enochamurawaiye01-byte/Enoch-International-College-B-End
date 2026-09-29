const { prisma } = require("../../config/database");

const findAll = () => prisma.role.findMany({ include: { permissions: { include: { permission: true } }, users: true }, orderBy: { name: "asc" } });
const findById = (id, tx = prisma) => tx.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } }, users: true } });
const findByName = (name, tx = prisma) => tx.role.findUnique({ where: { name } });
const create = (data) => prisma.role.create({ data });
const update = (id, data) => prisma.role.update({ where: { id }, data });
const remove = (id) => prisma.role.delete({ where: { id } });

const assign = (data) => prisma.userRoleAssignment.upsert({
  where: { userId_roleId: { userId: data.userId, roleId: data.roleId } },
  update: {
    status: data.status || "PENDING",
    assignedBy: data.assignedBy || null,
    activationToken: data.activationToken || null
  },
  create: {
    userId: data.userId,
    roleId: data.roleId,
    status: data.status || "PENDING",
    assignedBy: data.assignedBy || null,
    activationToken: data.activationToken || null
  }
});

const findAssignmentByToken = (activationToken) => prisma.userRoleAssignment.findUnique({
  where: { activationToken },
  include: { role: true, user: true }
});

const findUserAssignments = (userId) => prisma.userRoleAssignment.findMany({
  where: { userId },
  include: { role: true }
});

const findUserRoleAssignment = (userId, roleId, status = "ACTIVE", tx = prisma) => tx.userRoleAssignment.findFirst({
  where: { userId, roleId, status }
});

const activateAssignment = (id, activatedBy) => prisma.userRoleAssignment.update({
  where: { id },
  data: {
    status: "ACTIVE",
    activatedBy: activatedBy || null,
    activatedAt: new Date()
  }
});

const revoke = (data) => prisma.userRoleAssignment.update({
  where: { userId_roleId: { userId: data.userId, roleId: data.roleId } },
  data: { status: "REMOVED", removedAt: new Date() }
});

const findUser = (id) => prisma.user.findUnique({ where: { id } });

const countActiveSuperAdmins = async (tx = prisma) => {
  const superAdminRole = await tx.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  const directUsersCount = await tx.user.count({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" }
  });

  let assignedCount = 0;
  if (superAdminRole) {
    assignedCount = await tx.userRoleAssignment.count({
      where: {
        roleId: superAdminRole.id,
        status: "ACTIVE",
        user: { status: "ACTIVE" }
      }
    });
  }

  return Math.max(directUsersCount, assignedCount);
};

const updateUserRole = (id, role) => prisma.user.update({ where: { id }, data: { role } });

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  remove,
  assign,
  findAssignmentByToken,
  findUserAssignments,
  findUserRoleAssignment,
  activateAssignment,
  revoke,
  findUser,
  countActiveSuperAdmins,
  updateUserRole
};
