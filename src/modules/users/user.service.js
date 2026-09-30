const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./user.repository");
const roleRepository = require("../roles/role.repository");
const roleService = require("../roles/role.service");
const { hashNewPassword, normalizeQuery } = require("./user.utils");
const { sendApprovalEmail, sendRejectionEmail, sendApprovalSms } = require("../../config/mailer");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");

const titleCaseFromEnum = (str) => {
  if (!str) return "";
  return str.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

const getById = async (id) => { const user = await repository.findById(id); if (!user) throw new NotFoundError("User not found"); return user; };
const assertAdmin = (user) => { if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) throw new AppError("User administration access required.", 403, "USER_ACCESS_DENIED"); };
const create = async (data, actor) => {
  assertAdmin(actor);
  const email = data.email.toLowerCase();
  if (await repository.findByEmail(email)) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
  const role = data.role || "STAFF";
  const createData = {
    fullName: data.fullName,
    email,
    phoneNumber: data.phoneNumber || null,
    passwordHash: await hashNewPassword(data.password),
    role: "STAFF",
    status: "INACTIVE",
    schoolId: actor.schoolId || null
  };
  const user = await repository.create(createData);
  try {
    await roleService.changeUserRoles(user.id, { roles: [role] }, actor);
    await repository.update(user.id, { status: data.status || "ACTIVE" });
    return getById(user.id);
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.userRoleAssignment.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    }).catch(() => {});
    throw error;
  }
};
const list = async (query, actor) => { assertAdmin(actor); const normalized = normalizeQuery(query); const where = { ...(normalized.role ? { role: normalized.role } : {}), ...(normalized.status ? { status: normalized.status } : {}), ...(normalized.search ? { OR: [{ fullName: { contains: normalized.search, mode: "insensitive" } }, { email: { contains: normalized.search, mode: "insensitive" } }, { phoneNumber: { contains: normalized.search, mode: "insensitive" } }] } : {}) }; const [data, total] = await Promise.all([repository.findAll(where, (normalized.page - 1) * normalized.limit, normalized.limit), repository.count(where)]); return { data, pagination: { page: normalized.page, limit: normalized.limit, total, pages: Math.ceil(total / normalized.limit) } }; };
const update = async (id, data, actor) => {
  assertAdmin(actor);
  const target = await getById(id);
  const targetHasSuperAdmin = target.role === "SUPER_ADMIN"
    || target.roleAssignments?.some((assignment) => assignment.role?.name === "SUPER_ADMIN" && ["ACTIVE", "PENDING"].includes(assignment.status));
  if (targetHasSuperAdmin && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can modify a SUPER_ADMIN.", 403, "SUPER_ADMIN_PROTECTED");
  if (data.status === undefined) return repository.update(id, data);
  const { status, ...profileData } = data;
  await changeStatus(id, status, actor);
  return Object.keys(profileData).length ? repository.update(id, profileData) : getById(id);
};
const changeRole = async (id, role, actor) => {
  return roleService.changeUserRoles(id, { roles: [role] }, actor);
};

const changeStatus = async (id, status, actor) => {
  assertAdmin(actor);
  const target = await getById(id);
  if (id === actor.userId && status !== "ACTIVE") throw new AppError("You cannot deactivate your own account.", 403, "SELF_DISABLE_DENIED");
  const targetHasSuperAdmin = target.role === "SUPER_ADMIN"
    || target.roleAssignments?.some((assignment) => assignment.role?.name === "SUPER_ADMIN" && ["ACTIVE", "PENDING"].includes(assignment.status));
  if (targetHasSuperAdmin && status !== "ACTIVE") {
    await prisma.$transaction(async (tx) => {
      await roleRepository.lockSuperAdminLimit(tx);
      if (await roleRepository.countActiveSuperAdmins(tx) <= 1) {
        throw new AppError("The last active SUPER_ADMIN cannot be disabled.", 409, "LAST_SUPER_ADMIN_PROTECTED");
      }
      await tx.user.update({ where: { id }, data: { status } });
    });
  } else {
    await repository.update(id, { status });
  }

  let assignedRegNumber = null;

  if (status === "ACTIVE") {
    const nameParts = (target.fullName || "User").trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";

    if (target.role === "STUDENT") {
      const existingStudent = await prisma.student.findUnique({ where: { userId: id } });
      if (!existingStudent) {
        assignedRegNumber = await generateRegistrationNumber(prisma, target.fullName || "Student User");
        const defaultClass = await prisma.class.findFirst({ where: { isActive: true } });
        await prisma.student.create({
          data: {
            userId: id,
            registrationNumber: assignedRegNumber,
            firstName,
            lastName,
            status: "ACTIVE",
            currentClassId: defaultClass?.id || null,
            admissionDate: new Date()
          }
        });
      } else {
        assignedRegNumber = existingStudent.registrationNumber;
        await prisma.student.update({ where: { id: existingStudent.id }, data: { status: "ACTIVE" } });
      }
    } else if (target.role === "PARENT") {
      const existingParent = await prisma.parent.findUnique({ where: { userId: id } });
      if (!existingParent) {
        await prisma.parent.create({
          data: {
            userId: id,
            firstName,
            lastName
          }
        });
      }
    } else {
      const existingStaff = await prisma.staff.findUnique({ where: { userId: id } });
      if (!existingStaff) {
        const staffNumber = `MTC/STF/${Math.floor(1000 + Math.random() * 9000)}`;
        assignedRegNumber = staffNumber;
        await prisma.staff.create({
          data: {
            userId: id,
            staffNumber,
            firstName,
            lastName,
            jobTitle: titleCaseFromEnum(target.role),
            status: "ACTIVE",
            employmentDate: new Date()
          }
        });
      } else {
        assignedRegNumber = existingStaff.staffNumber;
        await prisma.staff.update({ where: { id: existingStaff.id }, data: { status: "ACTIVE" } });
      }
    }
  } else {
    if (target.role === "STUDENT") await prisma.student.updateMany({ where: { userId: id }, data: { status: "INACTIVE" } });
    if (target.role !== "STUDENT" && target.role !== "PARENT") await prisma.staff.updateMany({ where: { userId: id }, data: { status: "INACTIVE" } });
  }

  const followUpErrors = [];
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor.userId,
        action: status === "ACTIVE" ? "APPROVE" : "STATUS_CHANGE",
        entity: "User",
        entityId: id,
        description: `${status === "ACTIVE" ? "Approved" : "Changed status of"} ${target.fullName} (${target.role})`
      }
    });
  } catch (error) {
    followUpErrors.push(`Audit log: ${error.message}`);
  }

  if (status === "ACTIVE" && target.status !== "ACTIVE") {
    try {
      await prisma.notification.create({
        data: {
          userId: target.id,
          type: "SYSTEM",
          title: "Application approved",
          message: `Your application has been approved.${assignedRegNumber ? ` Registration number: ${assignedRegNumber}.` : " You can now sign in."}`
        }
      });
    } catch (error) {
      followUpErrors.push(`Notification: ${error.message}`);
    }

    const communication = { email: false, sms: false, registrationNumber: assignedRegNumber, errors: followUpErrors };

    if (target.email) {
      try {
        const nameParts = (target.fullName || "User").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        const result = await sendApprovalEmail({ to: target.email, name: target.fullName, role: target.role, registrationNumber: assignedRegNumber });
        if (!result?.success) throw new Error("The mailer did not accept the approval email.");
        communication.email = true;
        communication.emailMessageId = result.messageId;
      } catch (error) {
        communication.errors.push(`Email: ${error.message}`);
      }
    }
    return { ...(await getById(id)), registrationNumber: assignedRegNumber, communication };
  } else if (status === "DEACTIVATED" || status === "SUSPENDED") {
    if (target.email) {
      try {
        await sendRejectionEmail({ to: target.email, name: target.fullName });
      } catch (err) {
        followUpErrors.push(`Rejection email: ${err.message}`);
      }
    }
  }

  return { ...(await getById(id)), registrationNumber: assignedRegNumber, statusChangeWarnings: followUpErrors };
};

const resetPassword = async (id, password, actor) => { assertAdmin(actor); const target = await getById(id); if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can reset a SUPER_ADMIN password.", 403, "SUPER_ADMIN_PROTECTED"); return repository.update(id, { passwordHash: await hashNewPassword(password) }); };

const remove = async (id, actor) => {
  assertAdmin(actor);
  const target = await getById(id);
  if (id === actor.userId) throw new AppError("You cannot delete your own account.", 403, "SELF_DELETE_DENIED");
  const targetHasSuperAdmin = target.role === "SUPER_ADMIN"
    || target.roleAssignments?.some((assignment) => assignment.role?.name === "SUPER_ADMIN" && ["ACTIVE", "PENDING"].includes(assignment.status));
  if (targetHasSuperAdmin && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can delete another SUPER_ADMIN.", 403, "SUPER_ADMIN_PROTECTED");

  try {
    await prisma.auditLog.create({
      data: {
        userId: actor.userId,
        action: "DELETE_USER",
        entity: "User",
        entityId: id,
        description: `Deleted user ${target.fullName} (${target.email || 'No email'}) with role ${target.role}`
      }
    }).catch(() => {});
  } catch (err) {
    console.warn("[AuditLog Delete User Error]:", err.message);
  }

  // Atomically clean up dependent child records before removing user account
  await prisma.$transaction(async (tx) => {
    if (targetHasSuperAdmin) {
      await roleRepository.lockSuperAdminLimit(tx);
      if (await roleRepository.countActiveSuperAdmins(tx) <= 1) {
        throw new AppError("The last active SUPER_ADMIN cannot be deleted.", 409, "LAST_SUPER_ADMIN_PROTECTED");
      }
    }
    await tx.userRoleAssignment.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.permissionGrant.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.notification.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.student.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.staff.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.parent.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.user.delete({ where: { id } });
  });

  return { id, fullName: target.fullName, message: "User deleted successfully" };
};

module.exports = { create, list, getById, update, changeRole, changeStatus, resetPassword, remove };
