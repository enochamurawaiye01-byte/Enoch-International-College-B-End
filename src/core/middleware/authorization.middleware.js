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

		if (["SUPER_ADMIN", "ADMIN"].includes(req.user.role)) {
			return next();
		}

		const userPerm = await prisma.userPermission.findFirst({
			where: {
				userId: req.user.userId,
				permission: { key: permissionKey, isActive: true },
			},
		});

		if (userPerm) {
			return next();
		}

		const userRoleAssignments = await prisma.userRoleAssignment.findMany({
			where: { userId: req.user.userId },
			select: { roleId: true },
		});

		const roleIds = userRoleAssignments.map((ura) => ura.roleId);

		const roleByName = await prisma.role.findUnique({
			where: { name: req.user.role },
			select: { id: true },
		});

		if (roleByName && !roleIds.includes(roleByName.id)) {
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

