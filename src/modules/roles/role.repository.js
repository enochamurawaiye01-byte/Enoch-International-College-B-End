const { prisma } = require("../../config/database");

const findAll = () => prisma.role.findMany({
  include: { permissions: { include: { permission: true } } },
  orderBy: { name: "asc" }
});
const findById = (id, tx = prisma) => tx.role.findUnique({
  where: { id },
  include: { permissions: { include: { permission: true } }, users: { select: { id: true, status: true } } }
});
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
  select: {
    id: true,
    userId: true,
    roleId: true,
    status: true,
    assignedBy: true,
    activatedBy: true,
    activatedAt: true,
    removedAt: true,
    activationExpiresAt: true,
    assignedAt: true,
    role: { select: { id: true, name: true, description: true, isActive: true } }
  }
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

const findUser = (id) => prisma.user.findUnique({ where: { id }, include: { student: { select: { id: true } } } });

const lockSuperAdminLimit = async (tx) => {
  await tx.$queryRawUnsafe("WITH role_limit_lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(7432196081)) SELECT 1::int AS locked FROM role_limit_lock");
};

const lockExclusiveRole = async (tx, roleName, schoolId) => {
  await tx.$queryRawUnsafe(
    "SELECT pg_advisory_xact_lock(hashtext($1), 0)",
    `exclusive-role:${schoolId || "default"}:${roleName}`
  );
};

const findExclusiveRoleHolder = async (tx, { roleId, roleName, userId, schoolId }) => {
  const [assignment, primaryUser] = await Promise.all([
    tx.userRoleAssignment.findFirst({
      where: {
        roleId,
        userId: { not: userId },
        user: { is: { schoolId } },
        OR: [
          { status: "ACTIVE" },
          { status: "PENDING", activationExpiresAt: { gt: new Date() } }
        ]
      },
      select: { userId: true }
    }),
    tx.user.findFirst({
      where: { id: { not: userId }, schoolId, role: roleName, status: "ACTIVE" },
      select: { id: true }
    })
  ]);
  return assignment || primaryUser;
};

const countActiveSuperAdmins = (tx = prisma) => tx.user.count({
  where: {
    status: "ACTIVE",
    OR: [
      { role: "SUPER_ADMIN" },
      {
        roleAssignments: {
          some: {
            OR: [
              { status: "ACTIVE" },
              { status: "PENDING", activationExpiresAt: { gt: new Date() } }
            ],
            role: { name: "SUPER_ADMIN", isActive: true }
          }
        }
      }
    ]
  }
});

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
  lockSuperAdminLimit,
  lockExclusiveRole,
  findExclusiveRoleHolder,
  countActiveSuperAdmins,
  updateUserRole
};
