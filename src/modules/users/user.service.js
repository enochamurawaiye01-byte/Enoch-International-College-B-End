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

const deliverApprovalEmail = async (target, registrationNumber, profiles = {}) => {
  if (!target.email) throw new Error("The applicant account has no email address.");

  let classOrProgramme;
  let academicSession;
  let department;
  if (target.role === "STUDENT") {
    const student = profiles.student || await prisma.student.findUnique({
      where: { userId: target.id },
      include: { currentClass: true },
    });
    if (!student) throw new Error("The approved student profile could not be found.");
    classOrProgramme = student.currentClass?.name;
    const session = profiles.academicSession !== undefined
      ? profiles.academicSession
      : student.currentSessionId
        ? await prisma.academicSession.findUnique({ where: { id: student.currentSessionId } })
        : null;
    academicSession = session?.name;
  } else if (target.role === "PARENT") {
    throw new Error("Parent accounts do not receive student or staff approval letters.");
  } else {
    const staff = profiles.staff || await prisma.staff.findUnique({
      where: { userId: target.id },
      include: { department: true },
    });
    if (!staff) throw new Error("The approved staff profile could not be found.");
    registrationNumber = staff.staffNumber;
    department = staff.department?.name;
  }

  const result = await sendApprovalEmail({
    to: target.email,
    name: target.fullName,
    username: target.email,
    role: target.role,
    registrationNumber,
    classOrProgramme,
    academicSession,
    department,
  });
  if (!result?.success || !result.acceptedCount) {
    throw new Error("The email provider did not accept the approval message.");
  }
  return result;
};

const resendApprovalEmail = async (id, actor) => {
  assertAdmin(actor);
  const target = await getById(id);
  if (target.status !== "ACTIVE") throw new AppError("Only approved accounts can receive an approval email.", 409, "USER_NOT_ACTIVE");
  if (target.role === "PARENT") throw new AppError("Parent accounts do not receive student or staff approval letters.", 422, "APPROVAL_EMAIL_ROLE_INVALID");
  const student = target.role === "STUDENT"
    ? await prisma.student.findUnique({ where: { userId: target.id }, include: { currentClass: true } })
    : null;
  const staff = target.role !== "STUDENT"
    ? await prisma.staff.findUnique({ where: { userId: target.id }, include: { department: true } })
    : null;
  if ((target.role === "STUDENT" && !student) || (target.role !== "STUDENT" && !staff)) {
    throw new AppError("Approval emails are only available for accounts with a student or staff profile.", 422, "APPROVAL_EMAIL_ROLE_INVALID");
  }
  const academicSession = student?.currentSessionId
    ? await prisma.academicSession.findUnique({ where: { id: student.currentSessionId } })
    : null;
  const registrationNumber = student?.registrationNumber || staff?.staffNumber || null;
  try {
    const result = await deliverApprovalEmail(target, registrationNumber, { student, staff, academicSession });
    return { email: true, emailMessageId: result.messageId, emailAcceptedCount: result.acceptedCount };
  } catch (error) {
    console.error(`[Approval Email Failed] userId=${target.id} role=${target.role} code=${error.code || "UNKNOWN"} message=${error.message}`);
    return { email: false, errors: [error.message] };
  }
};

const activateStudentApplication = async (target) => prisma.$transaction(async (tx) => {
  await tx.user.updateMany({ where: { id: target.id, status: target.status }, data: { status: "ACTIVE" } });
  const student = await tx.student.findUnique({ where: { userId: target.id } });
  if (!student?.currentClassId) throw new AppError("A student profile and class selection are required before approval.", 409, "STUDENT_PROFILE_INCOMPLETE");
  if (!target.email) throw new AppError("A student email is required before approval.", 409, "STUDENT_EMAIL_REQUIRED");

  const schoolClass = await tx.class.findFirst({
    where: { id: student.currentClassId, isActive: true },
    include: { classLevel: true },
  });
  if (!schoolClass) throw new AppError("The selected class is no longer active.", 409, "STUDENT_CLASS_UNAVAILABLE");

  const isSeniorSecondary = schoolClass.classLevel.code.startsWith("SS");
  if (isSeniorSecondary && !student.desiredDepartmentId) throw new AppError("A department is required for senior secondary students.", 409, "STUDENT_DEPARTMENT_REQUIRED");
  if (student.desiredDepartmentId && !(await tx.department.findUnique({ where: { id: student.desiredDepartmentId } }))) {
    throw new AppError("The selected department no longer exists.", 409, "STUDENT_DEPARTMENT_UNAVAILABLE");
  }

  const session = await tx.academicSession.findFirst({
    where: { isActive: true, ...(target.schoolId ? { schoolId: target.schoolId } : {}) },
    include: { terms: { where: { isActive: true }, orderBy: { startDate: "desc" }, take: 1 } },
    orderBy: { startDate: "desc" },
  });
  const term = session?.terms[0];
  if (!session || !term) throw new AppError("An active academic session and term are required before approval.", 409, "ACTIVE_ACADEMIC_TERM_REQUIRED");

  const registrationNumber = student.registrationNumber || await generateRegistrationNumber(tx, target.fullName || "Student User");
  await tx.student.update({
    where: { id: student.id },
    data: {
      registrationNumber: student.registrationNumber || registrationNumber,
      status: "ACTIVE",
      currentClassId: schoolClass.id,
      currentSessionId: session.id,
      currentTerm: term.name,
      admissionDate: student.admissionDate || new Date(),
    },
  });

  const departmentId = isSeniorSecondary ? student.desiredDepartmentId : null;
  const enrollment = await tx.enrollment.upsert({
    where: { studentId_sessionId_termId: { studentId: student.id, sessionId: session.id, termId: term.id } },
    update: { classId: schoolClass.id, departmentId, status: "ACTIVE" },
    create: { studentId: student.id, sessionId: session.id, termId: term.id, classId: schoolClass.id, departmentId, status: "ACTIVE" },
  });
  const classSubjects = await tx.classSubject.findMany({
    where: { classId: schoolClass.id, subject: { isActive: true } },
    include: { subject: true },
  });
  const applicableSubjects = classSubjects.filter(({ subject }) => !isSeniorSecondary || !subject.departmentId || subject.departmentId === departmentId);
  if (applicableSubjects.length) {
    await tx.studentSubjectEnrollment.createMany({
      data: applicableSubjects.map(({ id }) => ({ enrollmentId: enrollment.id, classSubjectId: id })),
      skipDuplicates: true,
    });
  }
  return registrationNumber;
});

const changeStatus = async (id, status, actor) => {
  assertAdmin(actor);
  const target = await getById(id);
  if (id === actor.userId && status !== "ACTIVE") throw new AppError("You cannot deactivate your own account.", 403, "SELF_DISABLE_DENIED");
  const targetHasSuperAdmin = target.role === "SUPER_ADMIN"
    || target.roleAssignments?.some((assignment) => assignment.role?.name === "SUPER_ADMIN" && ["ACTIVE", "PENDING"].includes(assignment.status));
  let assignedRegNumber = null;
  if (status === "ACTIVE" && target.role === "STUDENT") {
    assignedRegNumber = await activateStudentApplication(target);
  } else if (targetHasSuperAdmin && status !== "ACTIVE") {
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

  if (status === "ACTIVE") {
    const nameParts = (target.fullName || "User").trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";

    if (target.role === "STUDENT") {
      const existingStudent = await prisma.student.findUnique({ where: { userId: id } });
      assignedRegNumber = existingStudent?.registrationNumber || assignedRegNumber;
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
        const staffNumber = `MIC/STF/${Math.floor(1000 + Math.random() * 9000)}`;
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

    if (target.role !== "PARENT") {
      try {
        const result = await deliverApprovalEmail(target, assignedRegNumber);
        communication.email = true;
        communication.emailMessageId = result.messageId;
      } catch (error) {
        communication.errors.push(`Email: ${error.message}`);
        console.error(`[Approval Email Failed] userId=${target.id} role=${target.role} code=${error.code || "UNKNOWN"} message=${error.message}`);
      }
    } else {
      communication.errors.push("No approval email is sent for parent accounts.");
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
    await tx.userPermission.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.notification.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.student.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.staff.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.parent.deleteMany({ where: { userId: id } }).catch(() => {});
    await tx.user.delete({ where: { id } });
  });

  return { id, fullName: target.fullName, message: "User deleted successfully" };
};

module.exports = { create, list, getById, update, changeRole, changeStatus, resendApprovalEmail, resetPassword, remove };
