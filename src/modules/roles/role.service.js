const crypto = require("crypto");
const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./role.repository");
const { audit } = require("./role.utils");
const { sendRoleAssignmentEmail } = require("../../config/mailer");

const MAX_SUPER_ADMINS = 3;

const getById = async (id) => {
  const role = await repository.findById(id);
  if (!role) throw new NotFoundError("Role not found");
  return role;
};

const getAll = () => repository.findAll();

const create = async (data, actorId) => {
  if (await repository.findByName(data.name)) throw new AppError("Role name already exists.", 409, "ROLE_EXISTS");
  const role = await repository.create(data);
  await audit(prisma, actorId, "ROLE_CREATED", "Role", role.id, `Created role ${role.name}`);
  return role;
};

const update = async (id, data, actorId) => {
  const role = await getById(id);
  if (role.isSystem) throw new AppError("System roles cannot be edited here.", 409, "SYSTEM_ROLE_PROTECTED");
  const updated = await repository.update(id, data);
  await audit(prisma, actorId, "ROLE_UPDATED", "Role", id, "Updated role");
  return updated;
};

const remove = async (id, actorId) => {
  const role = await getById(id);
  if (role.isSystem || role.users.length) throw new AppError("System or assigned roles cannot be deleted.", 409, "ROLE_IN_USE");
  const deleted = await repository.remove(id);
  await audit(prisma, actorId, "ROLE_DELETED", "Role", id, "Deleted role");
  return deleted;
};

/**
 * Assign Role(s) to User with PENDING ACTIVATION Workflow
 */
const assignRoles = async ({ userId, roleIds, immediateActive = false }, actor) => {
  if (!actor || !["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new AppError("Only authorized administrators can assign staff roles.", 403, "ROLE_MANAGEMENT_DENIED");
  }

  const targetUser = await repository.findUser(userId);
  if (!targetUser) throw new NotFoundError("Target user not found");

  const normalizedRoleIds = Array.isArray(roleIds) ? roleIds : [roleIds];
  const assignedRolesInfo = [];
  const followUpErrors = [];

  // Transaction for Max 3 Super Admin check and atomic role assignments
  await prisma.$transaction(async (tx) => {
    for (const rId of normalizedRoleIds) {
      let roleObj = await repository.findByName(rId, tx).catch(() => null);
      if (!roleObj) {
        roleObj = await repository.findById(rId, tx).catch(() => null);
      }
      if (!roleObj) throw new NotFoundError(`Role '${rId}' not found`);

      // Enforce Max 3 Super Admins Limit
      if (roleObj.name === "SUPER_ADMIN") {
        if (actor.role !== "SUPER_ADMIN") {
          throw new AppError("Only an existing SUPER_ADMIN can assign the SUPER_ADMIN role.", 403, "ROLE_ESCALATION_DENIED");
        }

        const currentSuperAdminsCount = await repository.countActiveSuperAdmins(tx);
        const existingAssignment = await repository.findUserRoleAssignment(userId, roleObj.id, "ACTIVE", tx);

        if (!existingAssignment && targetUser.role !== "SUPER_ADMIN" && currentSuperAdminsCount >= MAX_SUPER_ADMINS) {
          audit(prisma, actor.userId, "SUPER_ADMIN_LIMIT_VIOLATION_ATTEMPT", "User", userId, `Attempted to create a 4th Super Admin for ${targetUser.fullName}`).catch(() => {});
          throw new AppError(`Maximum limit of ${MAX_SUPER_ADMINS} Super Admins has been reached. Cannot assign a 4th Super Admin.`, 409, "SUPER_ADMIN_LIMIT_EXCEEDED");
        }
      }

      const status = immediateActive || roleObj.name === "SUPER_ADMIN" ? "ACTIVE" : "PENDING";
      const activationToken = status === "PENDING" ? crypto.randomBytes(32).toString("hex") : null;

      const assignment = await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId, roleId: roleObj.id } },
        update: {
          status,
          assignedBy: actor.userId,
          activationToken,
          assignedAt: new Date()
        },
        create: {
          userId,
          roleId: roleObj.id,
          status,
          assignedBy: actor.userId,
          activationToken
        }
      });

      assignedRolesInfo.push({ roleId: roleObj.id, name: roleObj.name, status, token: activationToken, assignmentId: assignment.id });
    }
  });

  // Create In-App Notification & Send Activation Email for Pending Roles
  const pendingRoles = assignedRolesInfo.filter(r => r.status === "PENDING");
  if (pendingRoles.length > 0) {
    const roleNamesList = pendingRoles.map(r => r.name).join(", ");
    const primaryToken = pendingRoles[0].token;
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const activationUrl = `${frontendBaseUrl}/pages/auth/activate-role.html?token=${primaryToken}`;

    try {
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "New Role Assigned — Action Required",
          message: `You have been assigned the role(s): ${roleNamesList}. Please click to activate your role permissions.`
        }
      });
    } catch (err) {
      followUpErrors.push(`Notification: ${err.message}`);
    }

    if (targetUser.email) {
      try {
        await sendRoleAssignmentEmail({
          to: targetUser.email,
          name: targetUser.fullName,
          roles: pendingRoles.map(r => r.name),
          activationUrl
        });
      } catch (err) {
        followUpErrors.push(`Email delivery: ${err.message}`);
      }
    }
  }

  await audit(prisma, actor.userId, "ROLES_ASSIGNED", "User", userId, `Assigned roles ${assignedRolesInfo.map(r => r.name).join(", ")}`);

  return {
    success: true,
    userId,
    assignedRoles: assignedRolesInfo,
    warnings: followUpErrors
  };
};

/**
 * Activate Assigned Role via Token or User Action
 */
const activateRole = async ({ token, assignmentId }, actorUser) => {
  let assignment = null;
  if (token) {
    assignment = await repository.findAssignmentByToken(token);
  } else if (assignmentId) {
    assignment = await prisma.userRoleAssignment.findUnique({
      where: { id: assignmentId },
      include: { role: true, user: true }
    });
  }

  if (!assignment) throw new NotFoundError("Role activation token or assignment not found.");

  if (actorUser.userId !== assignment.userId && !["SUPER_ADMIN", "ADMIN"].includes(actorUser.role)) {
    throw new AppError("You can only activate your own assigned role.", 403, "ACTIVATION_ACCESS_DENIED");
  }

  if (assignment.status === "ACTIVE") {
    return { success: true, message: "Role is already active.", assignment };
  }

  const activated = await repository.activateAssignment(assignment.id, actorUser.userId);

  // If user's primary role is default STAFF and new role is specialized, sync primary role
  if (assignment.user.role === "STAFF" && assignment.role.name !== "STAFF") {
    await repository.updateUserRole(assignment.userId, assignment.role.name);
  }

  await audit(prisma, actorUser.userId, "ROLE_ACTIVATED", "User", assignment.userId, `Activated role ${assignment.role.name}`);

  return {
    success: true,
    message: `Role ${assignment.role.name} activated successfully.`,
    assignment: activated
  };
};

/**
 * Multi-Role Change & Sync for Staff Member
 */
const changeUserRoles = async (userId, { roles, roleIds }, actor) => {
  if (!actor || !["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new AppError("Only authorized administrators can change staff roles.", 403, "ROLE_MANAGEMENT_DENIED");
  }

  const targetUser = await repository.findUser(userId);
  if (!targetUser) throw new NotFoundError("Target user not found");

  if (userId === actor.userId) {
    throw new AppError("You cannot modify your own administrative roles.", 403, "SELF_ROLE_CHANGE_DENIED");
  }

  const newRoleNamesOrIds = Array.isArray(roles || roleIds) ? (roles || roleIds) : [roles || roleIds];

  // Map to DB Role objects
  const targetDbRoles = [];
  for (const item of newRoleNamesOrIds) {
    let r = await prisma.role.findUnique({ where: { name: item } });
    if (!r) r = await prisma.role.findUnique({ where: { id: item } });
    if (r) targetDbRoles.push(r);
  }

  const existingAssignments = await repository.findUserAssignments(userId);
  const existingActiveRoleIds = existingAssignments.filter(a => a.status === "ACTIVE").map(a => a.roleId);
  const targetRoleIds = targetDbRoles.map(r => r.id);

  // Identify roles to remove
  const rolesToRemove = existingAssignments.filter(a => !targetRoleIds.includes(a.roleId));

  for (const rem of rolesToRemove) {
    if (rem.role.name === "SUPER_ADMIN") {
      const activeSuperAdmins = await repository.countActiveSuperAdmins();
      if (activeSuperAdmins <= 1) {
        throw new AppError("The last active SUPER_ADMIN cannot be removed.", 409, "LAST_SUPER_ADMIN_PROTECTED");
      }
    }
    await repository.revoke({ userId, roleId: rem.roleId });
  }

  // Assign/Add new roles
  const rolesToAdd = targetRoleIds.filter(id => !existingActiveRoleIds.includes(id));
  let assignResult = null;
  if (rolesToAdd.length > 0) {
    assignResult = await assignRoles({ userId, roleIds: rolesToAdd, immediateActive: true }, actor);
  }

  // Set primary role on User object to top active role
  const updatedActiveAssignments = await repository.findUserAssignments(userId);
  const topActive = updatedActiveAssignments.find(a => a.status === "ACTIVE");
  if (topActive) {
    await repository.updateUserRole(userId, topActive.role.name);
  } else {
    await repository.updateUserRole(userId, "STAFF");
  }

  await audit(prisma, actor.userId, "CHANGE_USER_ROLES", "User", userId, `Updated roles for ${targetUser.fullName}`);

  return {
    success: true,
    user: await repository.findUser(userId),
    assignments: await repository.findUserAssignments(userId),
    assignResult
  };
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  assignRoles,
  activateRole,
  changeUserRoles
};
