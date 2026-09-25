const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./user.repository");
const { hashNewPassword, normalizeQuery } = require("./user.utils");
const { sendApprovalEmail, sendApprovalSms } = require("../../config/mailer");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");
const klaviyoService = require("../klaviyo/klaviyo.service");

const titleCaseFromEnum = (str) => {
  if (!str) return "";
  return str.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

const getById = async (id) => { const user = await repository.findById(id); if (!user) throw new NotFoundError("User not found"); return user; };
const assertAdmin = (user) => { if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) throw new AppError("User administration access required.", 403, "USER_ACCESS_DENIED"); };
const create = async (data, actor) => { assertAdmin(actor); const email = data.email.toLowerCase(); if (await repository.findByEmail(email)) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS"); if (data.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can create another SUPER_ADMIN.", 403, "ROLE_ESCALATION_DENIED"); return repository.create({ fullName: data.fullName, email, phoneNumber: data.phoneNumber || null, passwordHash: await hashNewPassword(data.password), role: data.role || "STAFF", status: data.status || "ACTIVE", schoolId: actor.schoolId || null }); };
const list = async (query, actor) => { assertAdmin(actor); const normalized = normalizeQuery(query); const where = { ...(normalized.role ? { role: normalized.role } : {}), ...(normalized.status ? { status: normalized.status } : {}), ...(normalized.search ? { OR: [{ fullName: { contains: normalized.search, mode: "insensitive" } }, { email: { contains: normalized.search, mode: "insensitive" } }, { phoneNumber: { contains: normalized.search, mode: "insensitive" } }] } : {}) }; const [data, total] = await Promise.all([repository.findAll(where, (normalized.page - 1) * normalized.limit, normalized.limit), repository.count(where)]); return { data, pagination: { page: normalized.page, limit: normalized.limit, total, pages: Math.ceil(total / normalized.limit) } }; };
const update = async (id, data, actor) => { assertAdmin(actor); const target = await getById(id); if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can modify a SUPER_ADMIN.", 403, "SUPER_ADMIN_PROTECTED"); return repository.update(id, data); };
const changeRole = async (id, role, actor) => { assertAdmin(actor); const target = await getById(id); if (id === actor.userId) throw new AppError("You cannot change your own role.", 403, "SELF_ROLE_CHANGE_DENIED"); if (role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can grant SUPER_ADMIN.", 403, "ROLE_ESCALATION_DENIED"); if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN" && await repository.countActiveSuperAdmins() <= 1) throw new AppError("The last active SUPER_ADMIN cannot be demoted.", 409, "LAST_SUPER_ADMIN_PROTECTED"); return repository.update(id, { role }); };

const changeStatus = async (id, status, actor) => {
  assertAdmin(actor);
  const target = await getById(id);
  if (id === actor.userId && status !== "ACTIVE") throw new AppError("You cannot deactivate your own account.", 403, "SELF_DISABLE_DENIED");
  if (target.role === "SUPER_ADMIN" && status !== "ACTIVE" && await repository.countActiveSuperAdmins() <= 1) throw new AppError("The last active SUPER_ADMIN cannot be disabled.", 409, "LAST_SUPER_ADMIN_PROTECTED");

  await repository.update(id, { status });

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
    } else if (["TEACHER", "STAFF", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "BURSAR", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(target.role)) {
      const existingStaff = await prisma.staff.findUnique({ where: { userId: id } });
      if (!existingStaff) {
        const staffNumber = `EIC/STF/${Math.floor(1000 + Math.random() * 9000)}`;
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
    }
  } else {
    if (target.role === "STUDENT") await prisma.student.updateMany({ where: { userId: id }, data: { status: "INACTIVE" } });
    if (["TEACHER", "STAFF"].includes(target.role)) await prisma.staff.updateMany({ where: { userId: id }, data: { status: "INACTIVE" } });
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

        // Sync to Klaviyo List & Track Approval Event
        await klaviyoService.subscribeProfileToList({
          email: target.email,
          firstName,
          lastName,
          phoneNumber: target.phoneNumber || undefined,
        }).catch((err) => followUpErrors.push(`Klaviyo subscribe: ${err.message}`));

        await klaviyoService.trackApprovalEvent({
          email: target.email,
          firstName,
          lastName,
          role: target.role,
          registrationNumber: assignedRegNumber,
        }).catch((err) => followUpErrors.push(`Klaviyo event: ${err.message}`));

        const result = await sendApprovalEmail({ to: target.email, name: target.fullName, role: target.role, registrationNumber: assignedRegNumber });
        communication.email = true;
        communication.emailMessageId = result.messageId;
      } catch (error) {
        communication.errors.push(`Email: ${error.message}`);
      }
    }
    return { ...(await getById(id)), registrationNumber: assignedRegNumber, communication };
  }

  return { ...(await getById(id)), registrationNumber: assignedRegNumber, statusChangeWarnings: followUpErrors };
};

const resetPassword = async (id, password, actor) => { assertAdmin(actor); const target = await getById(id); if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can reset a SUPER_ADMIN password.", 403, "SUPER_ADMIN_PROTECTED"); return repository.update(id, { passwordHash: await hashNewPassword(password) }); };
module.exports = { create, list, getById, update, changeRole, changeStatus, resetPassword };
