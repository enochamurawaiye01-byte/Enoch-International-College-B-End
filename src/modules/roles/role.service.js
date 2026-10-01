const crypto = require("crypto");
const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./role.repository");
const { audit } = require("./role.utils");
const { sendRoleAssignmentEmail } = require("../../config/mailer");
const { UserRole } = require("@prisma/client");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");

const MAX_SUPER_ADMINS = 3;
const ROLE_ACTIVATION_TTL_MS = 72 * 60 * 60 * 1000;
const EXCLUSIVE_ROLE_NAMES = new Set([
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "VICE_PRINCIPAL_ACADEMICS",
  "VICE_PRINCIPAL_ADMIN",
  "HEAD_TEACHER",
  "DEPUTY_HEAD_TEACHER",
  "SCHOOL_ADMINISTRATOR",
  "BURSAR",
  "REGISTRAR"
]);
const buildRoleActivationUrl = (assignmentId) => {
  const configuredUrl = process.env.FRONTEND_URL?.trim();
  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error("FRONTEND_URL must be configured to send role activation links.");
  }
  const frontendUrl = new URL(configuredUrl || "http://localhost:5500");
  if (!["http:", "https:"].includes(frontendUrl.protocol)
      || (process.env.NODE_ENV === "production" && frontendUrl.protocol !== "https:")) {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }
  frontendUrl.pathname = `${frontendUrl.pathname.replace(/\/$/, "")}/activate-role.html`;
  frontendUrl.search = "";
  frontendUrl.searchParams.set("assignmentId", assignmentId);
  return frontendUrl.toString();
};
const auditDeniedRoleAction = (actor, userId, action) => audit(
  prisma,
  actor?.userId || null,
  action,
  "User",
  userId || null,
  "Unauthorized role-management attempt"
);
const isStudentAccount = (user) => user?.role === "STUDENT" || Boolean(user?.student);

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
const assignRoles = async ({ userId, roleIds }, actor) => {
  if (!actor || !["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    await auditDeniedRoleAction(actor, userId, "UNAUTHORIZED_ROLE_ASSIGNMENT_ATTEMPT");
    throw new AppError("Only authorized administrators can assign staff roles.", 403, "ROLE_MANAGEMENT_DENIED");
  }
  if (userId === actor.userId) {
    await auditDeniedRoleAction(actor, userId, "SELF_ROLE_ASSIGNMENT_ATTEMPT");
    throw new AppError("You cannot assign roles to your own account.", 403, "SELF_ROLE_CHANGE_DENIED");
  }

  const targetUser = await repository.findUser(userId);
  if (!targetUser) throw new NotFoundError("Target user not found");
  if (isStudentAccount(targetUser)) {
    throw new AppError("Students cannot be assigned system roles. Manage student prefect positions through Prefects.", 403, "STUDENT_SYSTEM_ROLE_DENIED");
  }

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
      if (!roleObj.isActive) throw new AppError(`Role '${roleObj.name}' is inactive.`, 409, "ROLE_INACTIVE");

      const existingAssignment = await tx.userRoleAssignment.findUnique({
        where: { userId_roleId: { userId, roleId: roleObj.id } }
      });
      if (existingAssignment && existingAssignment.status === "ACTIVE") {
        assignedRolesInfo.push({ roleId: roleObj.id, name: roleObj.name, status: existingAssignment.status, assignmentId: existingAssignment.id, existing: true });
        continue;
      }
      if (existingAssignment?.status === "PENDING" && existingAssignment.activationExpiresAt > new Date()) {
        assignedRolesInfo.push({ roleId: roleObj.id, name: roleObj.name, status: existingAssignment.status, assignmentId: existingAssignment.id, existing: true });
        continue;
      }

      if (EXCLUSIVE_ROLE_NAMES.has(roleObj.name)) {
        await repository.lockExclusiveRole(tx, roleObj.name, targetUser.schoolId);
        const existingHolder = await repository.findExclusiveRoleHolder(tx, {
          roleId: roleObj.id,
          roleName: roleObj.name,
          userId,
          schoolId: targetUser.schoolId
        });
        if (existingHolder) {
          throw new AppError(`The ${roleObj.name.replaceAll("_", " ")} role is already assigned to another person in this school.`, 409, "ROLE_ALREADY_ASSIGNED");
        }
      }

      // Enforce Max 3 Super Admins Limit
      if (roleObj.name === "SUPER_ADMIN") {
        await repository.lockSuperAdminLimit(tx);
        if (actor.role !== "SUPER_ADMIN") {
          throw new AppError("Only an existing SUPER_ADMIN can assign the SUPER_ADMIN role.", 403, "ROLE_ESCALATION_DENIED");
        }

        const currentSuperAdminsCount = await repository.countActiveSuperAdmins(tx);
        const alreadyCounted = targetUser.status === "ACTIVE" && targetUser.role === "SUPER_ADMIN";
        if (!alreadyCounted && currentSuperAdminsCount >= MAX_SUPER_ADMINS) {
          audit(prisma, actor.userId, "SUPER_ADMIN_LIMIT_VIOLATION_ATTEMPT", "User", userId, `Attempted to create a 4th Super Admin for ${targetUser.fullName}`).catch(() => {});
          throw new AppError(`Maximum limit of ${MAX_SUPER_ADMINS} Super Admins has been reached. Cannot assign a 4th Super Admin.`, 409, "SUPER_ADMIN_LIMIT_EXCEEDED");
        }
      }

      const status = "PENDING";
      const activationToken = crypto.randomBytes(32).toString("hex");
      const activationExpiresAt = new Date(Date.now() + ROLE_ACTIVATION_TTL_MS);

      const assignment = await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId, roleId: roleObj.id } },
        update: {
          status,
          assignedBy: actor.userId,
          activationToken,
          activationExpiresAt,
          activatedBy: null,
          activatedAt: null,
          removedAt: null,
          assignedAt: new Date()
        },
        create: {
          userId,
          roleId: roleObj.id,
          status,
          assignedBy: actor.userId,
          activationToken,
          activationExpiresAt
        }
      });

      assignedRolesInfo.push({ roleId: roleObj.id, name: roleObj.name, status, token: activationToken, assignmentId: assignment.id });
    }
  });

  // Create In-App Notification & Send Activation Email for Pending Roles
  const pendingRoles = assignedRolesInfo.filter(r => r.status === "PENDING" && !r.existing);
  if (pendingRoles.length > 0) {
    await prisma.userSession.deleteMany({ where: { userId } });
    for (const assignedRole of pendingRoles) {
      try {
        await prisma.notification.create({
          data: {
            userId,
            type: "SYSTEM",
            title: "New Role Assigned — Action Required",
            message: `You have been assigned the role of ${assignedRole.name}. Activate this role to receive its permissions.`,
            roleAssignmentId: assignedRole.assignmentId
          }
        });
      } catch (err) {
        followUpErrors.push(`Notification: ${err.message}`);
      }

      if (targetUser.email) {
        try {
          const activationUrl = buildRoleActivationUrl(assignedRole.assignmentId);
          await sendRoleAssignmentEmail({
            to: targetUser.email,
            name: targetUser.fullName,
            roles: [assignedRole.name],
            activationUrl
          });
        } catch (err) {
          followUpErrors.push(`Email delivery: ${err.message}`);
        }
      }
    }
  }

  await audit(prisma, actor.userId, "ROLES_ASSIGNED", "User", userId, `Assigned roles ${assignedRolesInfo.map(r => r.name).join(", ")}`);

  return {
    success: true,
    userId,
    assignedRoles: assignedRolesInfo.map(({ token, ...role }) => role),
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
      include: { role: true, user: { include: { student: { select: { id: true } } } } }
    });
  }

  if (!assignment) throw new NotFoundError("Role activation token or assignment not found.");

  if (actorUser.userId !== assignment.userId) {
    throw new AppError("You can only activate your own assigned role.", 403, "ACTIVATION_ACCESS_DENIED");
  }
  if (isStudentAccount(assignment.user) && assignment.role.name !== "STUDENT") {
    throw new AppError("Students cannot activate system roles. Manage student prefect positions through Prefects.", 403, "STUDENT_SYSTEM_ROLE_DENIED");
  }

  if (assignment.status !== "PENDING") {
    throw new AppError("This role assignment is no longer pending.", 409, "ROLE_ASSIGNMENT_NOT_PENDING");
  }
  const now = new Date();
  if (!assignment.activationExpiresAt || assignment.activationExpiresAt <= now) {
    throw new AppError("This role activation has expired. Ask an administrator to assign the role again.", 410, "ROLE_ACTIVATION_EXPIRED");
  }

  const activated = await prisma.$transaction(async (tx) => {
    if (assignment.role.name === "SUPER_ADMIN") await repository.lockSuperAdminLimit(tx);
    if (EXCLUSIVE_ROLE_NAMES.has(assignment.role.name)) {
      await repository.lockExclusiveRole(tx, assignment.role.name, assignment.user.schoolId);
      const existingHolder = await repository.findExclusiveRoleHolder(tx, {
        roleId: assignment.roleId,
        roleName: assignment.role.name,
        userId: assignment.userId,
        schoolId: assignment.user.schoolId
      });
      if (existingHolder) {
        throw new AppError(`The ${assignment.role.name.replaceAll("_", " ")} role is already assigned to another person in this school.`, 409, "ROLE_ALREADY_ASSIGNED");
      }
    }
    const update = await tx.userRoleAssignment.updateMany({
      where: {
        id: assignment.id,
        userId: actorUser.userId,
        status: "PENDING",
        activationExpiresAt: { gt: now }
      },
      data: {
        status: "ACTIVE",
        activatedBy: actorUser.userId,
        activatedAt: now,
        activationToken: null
      }
    });
    if (update.count !== 1) {
      throw new AppError("This role assignment was already activated or has expired.", 409, "ROLE_ASSIGNMENT_NOT_PENDING");
    }

    if (Object.values(UserRole).includes(assignment.role.name)) {
      await tx.user.update({ where: { id: assignment.userId }, data: { role: assignment.role.name } });
    }

    const nameParts = (assignment.user.fullName || "User").trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";
    if (assignment.role.name === "STUDENT") {
      const existingStudent = await tx.student.findUnique({ where: { userId: assignment.userId } });
      if (!existingStudent) {
        const registrationNumber = await generateRegistrationNumber(tx, assignment.user.fullName || "Student User");
        const defaultClass = await tx.class.findFirst({ where: { isActive: true } });
        await tx.student.create({
          data: {
            userId: assignment.userId,
            registrationNumber,
            firstName,
            lastName,
            status: "ACTIVE",
            currentClassId: defaultClass?.id || null,
            admissionDate: now
          }
        });
      } else if (existingStudent.status !== "ACTIVE") {
        await tx.student.update({ where: { id: existingStudent.id }, data: { status: "ACTIVE" } });
      }
    } else if (assignment.role.name === "PARENT") {
      const existingParent = await tx.parent.findUnique({ where: { userId: assignment.userId } });
      if (!existingParent) await tx.parent.create({ data: { userId: assignment.userId, firstName, lastName } });
    } else {
      const existingStaff = await tx.staff.findUnique({ where: { userId: assignment.userId } });
      if (!existingStaff) {
        await tx.staff.create({
          data: {
            userId: assignment.userId,
            staffNumber: `MTC/STF/${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
            firstName,
            lastName,
            jobTitle: assignment.role.name.split("_").map((word) => word[0] + word.slice(1).toLowerCase()).join(" "),
            status: "ACTIVE",
            employmentDate: now
          }
        });
      }
    }

    await tx.notification.updateMany({
      where: { userId: actorUser.userId, roleAssignmentId: assignment.id, status: "UNREAD" },
      data: { status: "READ", readAt: now }
    });
    return tx.userRoleAssignment.findUnique({
      where: { id: assignment.id },
      select: {
        id: true,
        userId: true,
        roleId: true,
        status: true,
        activatedBy: true,
        activatedAt: true,
        role: { select: { id: true, name: true, description: true } }
      }
    });
  });

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
    await auditDeniedRoleAction(actor, userId, "UNAUTHORIZED_ROLE_CHANGE_ATTEMPT");
    throw new AppError("Only authorized administrators can change staff roles.", 403, "ROLE_MANAGEMENT_DENIED");
  }

  const targetUser = await repository.findUser(userId);
  if (!targetUser) throw new NotFoundError("Target user not found");

  if (userId === actor.userId) {
    throw new AppError("You cannot modify your own administrative roles.", 403, "SELF_ROLE_CHANGE_DENIED");
  }

  const requestedRoles = roles !== undefined ? roles : roleIds;
  const requestedNamesOrIds = requestedRoles == null ? [] : (Array.isArray(requestedRoles) ? requestedRoles : [requestedRoles]);
  if (isStudentAccount(targetUser) && requestedNamesOrIds.length) {
    throw new AppError("Students cannot be assigned system roles. Manage student prefect positions through Prefects.", 403, "STUDENT_SYSTEM_ROLE_DENIED");
  }
  const targetDbRoles = [];
  const seenRoleIds = new Set();
  for (const item of requestedNamesOrIds) {
    let role = await prisma.role.findUnique({ where: { name: item } });
    if (!role) role = await prisma.role.findUnique({ where: { id: item } });
    if (!role) throw new NotFoundError(`Role '${item}' not found`);
    if (!role.isActive) throw new AppError(`Role '${role.name}' is inactive.`, 409, "ROLE_INACTIVE");
    if (!seenRoleIds.has(role.id)) targetDbRoles.push(role);
    seenRoleIds.add(role.id);
  }

  const existingAssignments = await repository.findUserAssignments(userId);
  const existingByRoleId = new Map(existingAssignments.map((assignment) => [assignment.roleId, assignment]));
  const targetRoleIds = new Set(targetDbRoles.map((role) => role.id));
  const removedAssignments = existingAssignments.filter((assignment) =>
    ["ACTIVE", "PENDING"].includes(assignment.status) && !targetRoleIds.has(assignment.roleId)
  );
  const addedRoles = targetDbRoles.filter((role) => {
    const existing = existingByRoleId.get(role.id);
    return !existing || existing.status === "REMOVED";
  });
  const newAssignments = [];

  await prisma.$transaction(async (tx) => {
    const exclusiveRolesToLock = [...new Map(
      [...addedRoles, ...removedAssignments.map((assignment) => assignment.role)]
        .filter((role) => EXCLUSIVE_ROLE_NAMES.has(role.name))
        .map((role) => [role.name, role])
    ).values()].sort((left, right) => left.name.localeCompare(right.name));
    for (const role of exclusiveRolesToLock) {
      await repository.lockExclusiveRole(tx, role.name, targetUser.schoolId);
    }

    for (const role of addedRoles.filter((item) => EXCLUSIVE_ROLE_NAMES.has(item.name))) {
      const existingHolder = await repository.findExclusiveRoleHolder(tx, {
        roleId: role.id,
        roleName: role.name,
        userId,
        schoolId: targetUser.schoolId
      });
      if (existingHolder) {
        throw new AppError(`The ${role.name.replaceAll("_", " ")} role is already assigned to another person in this school.`, 409, "ROLE_ALREADY_ASSIGNED");
      }
    }

    const changesSuperAdmin = removedAssignments.some((assignment) => assignment.role.name === "SUPER_ADMIN")
      || addedRoles.some((role) => role.name === "SUPER_ADMIN");
    if (changesSuperAdmin) await repository.lockSuperAdminLimit(tx);

    if (removedAssignments.some((assignment) => assignment.role.name === "SUPER_ADMIN")
      && await repository.countActiveSuperAdmins(tx) <= 1) {
      throw new AppError("The last available SUPER_ADMIN cannot be removed.", 409, "LAST_SUPER_ADMIN_PROTECTED");
    }

    for (const role of addedRoles) {
      if (role.name === "SUPER_ADMIN") {
        if (actor.role !== "SUPER_ADMIN") throw new AppError("Only an existing SUPER_ADMIN can assign the SUPER_ADMIN role.", 403, "ROLE_ESCALATION_DENIED");
        const count = await repository.countActiveSuperAdmins(tx);
        const alreadyCounted = targetUser.status === "ACTIVE" && targetUser.role === "SUPER_ADMIN";
        if (!alreadyCounted && count >= MAX_SUPER_ADMINS) {
          throw new AppError(`Maximum limit of ${MAX_SUPER_ADMINS} Super Admins has been reached.`, 409, "SUPER_ADMIN_LIMIT_EXCEEDED");
        }
      }
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + ROLE_ACTIVATION_TTL_MS);
      const assignment = await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {
          status: "PENDING", assignedBy: actor.userId, activationToken: token,
          activationExpiresAt: expiry, activatedBy: null, activatedAt: null,
          removedAt: null, assignedAt: new Date()
        },
        create: {
          userId, roleId: role.id, status: "PENDING", assignedBy: actor.userId,
          activationToken: token, activationExpiresAt: expiry
        }
      });
      newAssignments.push({ assignmentId: assignment.id, roleId: role.id, name: role.name, token });
    }

    for (const assignment of removedAssignments) {
      await tx.userRoleAssignment.update({
        where: { userId_roleId: { userId, roleId: assignment.roleId } },
        data: { status: "REMOVED", removedAt: new Date(), activationToken: null, activationExpiresAt: null }
      });
      await tx.notification.updateMany({
        where: { userId, roleAssignmentId: assignment.id, status: "UNREAD" },
        data: { status: "READ", readAt: new Date() }
      });
    }

    if (newAssignments.length || removedAssignments.length) {
      await tx.userSession.deleteMany({ where: { userId } });
    }

    const activeAssignments = await tx.userRoleAssignment.findMany({
      where: { userId, status: "ACTIVE" },
      include: { role: true },
      orderBy: { assignedAt: "asc" }
    });
    const nextPrimary = activeAssignments.find((assignment) => targetRoleIds.has(assignment.roleId));
    const nextPrimaryName = nextPrimary?.role.name || "STAFF";
    if (Object.values(UserRole).includes(nextPrimaryName)) {
      await tx.user.update({ where: { id: userId }, data: { role: nextPrimaryName } });
    }
  });

  const followUpErrors = [];
  for (const assignment of newAssignments) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          roleAssignmentId: assignment.assignmentId,
          type: "SYSTEM",
          title: "New Role Assigned — Action Required",
          message: `You have been assigned the role of ${assignment.name}. Activate this role to receive its permissions.`
        }
      });
    } catch (error) {
      followUpErrors.push(`Notification: ${error.message}`);
    }
    if (targetUser.email) {
      try {
        const activationUrl = buildRoleActivationUrl(assignment.assignmentId);
        await sendRoleAssignmentEmail({ to: targetUser.email, name: targetUser.fullName, roles: [assignment.name], activationUrl });
      } catch (error) {
        followUpErrors.push(`Email delivery: ${error.message}`);
      }
    }
  }

  await audit(prisma, actor.userId, "CHANGE_USER_ROLES", "User", userId, `Updated roles for ${targetUser.fullName}`);

  return {
    success: true,
    user: await repository.findUser(userId),
    assignments: await repository.findUserAssignments(userId),
    warnings: followUpErrors
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
  changeUserRoles,
  buildRoleActivationUrl
};
