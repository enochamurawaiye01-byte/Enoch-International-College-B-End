const AuthError = require("../errors/AuthError");
const { prisma } = require("../../config/database");

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(
      new AuthError(
        "You do not have permission to perform this action",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    );
  }

  next();
};

const requirePermission = (permissionKey) => async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthError("Authentication required", 401, "UNAUTHENTICATED");
    }

    // SUPER_ADMIN has unconditional access to all modules and actions
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    // Direct User Permission override
    const userPerm = await prisma.userPermission.findFirst({
      where: {
        userId: req.user.userId,
        permission: { key: permissionKey, isActive: true },
      },
    });

    if (userPerm) {
      return next();
    }

    // Fetch ONLY ACTIVE UserRoleAssignments for multi-role user
    const userRoleAssignments = await prisma.userRoleAssignment.findMany({
      where: {
        userId: req.user.userId,
        status: "ACTIVE"
      },
      select: { roleId: true },
    });

    const roleIds = userRoleAssignments.map((ura) => ura.roleId);

    // Also include primary User.role if active in DB
    const roleByName = await prisma.role.findUnique({
      where: { name: req.user.role },
      select: { id: true, isActive: true },
    });

    if (roleByName && roleByName.isActive && !roleIds.includes(roleByName.id)) {
      roleIds.push(roleByName.id);
    }

    if (roleIds.length > 0) {
      const rolePerm = await prisma.rolePermission.findFirst({
        where: {
          roleId: { in: roleIds },
          permission: { key: permissionKey, isActive: true },
        },
      });

      if (rolePerm) {
        return next();
      }
    }

    throw new AuthError(
      `Permission '${permissionKey}' is required for this action`,
      403,
      "INSUFFICIENT_PERMISSIONS"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireRoles,
  requirePermission,
};
