const AuthError = require("../errors/AuthError");
const { prisma } = require("../../config/database");
const classRepository = require("../../modules/classes/class.repository");

const getResourceSegments = (req, resource) => {
  const segments = (req.originalUrl || req.baseUrl || "").split("?")[0].split("/").filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const apiIndex = segments.indexOf("api");
  const moduleIndex = versionIndex >= 0 ? versionIndex + 1 : apiIndex >= 0 ? apiIndex + 1 : 0;
  return segments[moduleIndex] === resource ? segments.slice(moduleIndex + 1) : null;
};

const hasAssignedClassAccess = async (user, permissionKey, req) => {
  if (!["classes:view", "students:view"].includes(permissionKey)
      || !req || !["GET", "HEAD"].includes((req.method || "").toUpperCase())) return false;
  const classIds = await classRepository.findTeacherClassIds(user.userId, user.schoolId, user.role);
  if (!classIds.length) return false;

  if (permissionKey === "classes:view") {
    const segments = getResourceSegments(req, "classes");
    if (!segments || segments[0] === "levels") return false;
    return !segments.length || classIds.includes(segments[0]);
  }

  if (permissionKey !== "students:view") return false;
  const segments = getResourceSegments(req, "students");
  if (!segments) return false;
  if (!segments.length) return true;

  const student = segments[0] === "registration" && segments[1]
    ? await prisma.student.findFirst({
      where: { registrationNumber: segments[1] },
      select: {
        currentClassId: true,
        enrollments: {
          where: { status: "ACTIVE", session: { isActive: true } },
          select: { classId: true }
        }
      }
    })
    : segments[0] !== "me"
      ? await prisma.student.findUnique({
        where: { id: segments[0] },
        select: {
          currentClassId: true,
          enrollments: {
            where: { status: "ACTIVE", session: { isActive: true } },
            select: { classId: true }
          }
        }
      })
      : null;
  if (!student) return false;
  const studentClassIds = new Set([
    student.currentClassId,
    ...(student.enrollments || []).map((enrollment) => enrollment.classId)
  ].filter(Boolean));
  return classIds.some((classId) => studentClassIds.has(classId));
};

const getEffectiveRoleIds = async (user) => {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: user.userId },
    include: { role: { select: { id: true, name: true, isActive: true } } }
  });
  const activeAssignments = assignments.filter((assignment) => assignment.status === "ACTIVE" && assignment.role.isActive);
  const roleIds = activeAssignments.map((assignment) => assignment.roleId);
  const primaryAssignment = assignments.find((assignment) => assignment.role.name === user.role);
  const roleNames = new Set(activeAssignments.map((assignment) => assignment.role.name));

  if (!assignments.length && !primaryAssignment && user.role !== "SUPER_ADMIN") {
    const primaryRole = await prisma.role.findUnique({ where: { name: user.role }, select: { id: true, isActive: true } });
    if (primaryRole?.isActive) {
      roleIds.push(primaryRole.id);
      roleNames.add(user.role);
    }
  }

  return { assignments, roleIds, roleNames };
};

const hasPermission = async (user, permissionKey, req) => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;

  const userPermission = await prisma.userPermission.findFirst({
    where: { userId: user.userId, permission: { key: permissionKey, isActive: true } },
    select: { userId: true }
  });
  if (userPermission) return true;

  const { roleIds } = await getEffectiveRoleIds(user);
  if (roleIds.length) {
    const rolePermission = await prisma.rolePermission.findFirst({
      where: { roleId: { in: [...new Set(roleIds)] }, permission: { key: permissionKey, isActive: true } },
      select: { roleId: true }
    });
    if (rolePermission) return true;
  }
  return hasAssignedClassAccess(user, permissionKey, req);
};

const moduleActionForRequest = (req) => {
  const path = (req.originalUrl || req.baseUrl || "").split("?")[0];
  const segments = path.split("/").filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const apiIndex = segments.indexOf("api");
  const moduleIndex = versionIndex >= 0 ? versionIndex + 1 : apiIndex >= 0 ? apiIndex + 1 : 0;
  const moduleSlug = segments[moduleIndex];
  if (!moduleSlug || ["auth", "notifications"].includes(moduleSlug)
      || (moduleSlug === "roles" && segments[moduleIndex + 1] === "activate")) return null;
  const module = moduleSlug === "dashboard" ? "dashboards" : moduleSlug.replace(/-/g, "_");
  const method = (req.method || "GET").toUpperCase();
  const approvesRecord = String(req.body?.status || "").toUpperCase() === "APPROVED";
  const action = method === "GET" || method === "HEAD" ? "view"
    : method === "POST" ? (/\/(approve|convert)(\/|$)/.test(path) ? "approve" : "create")
      : approvesRecord || /\/(approve|verify)(\/|$)/.test(path) ? "approve"
      : method === "DELETE" ? "delete" : "edit";
  return `${module}:${action}`;
};

const requireRoles = (...allowedRoles) => async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Authentication required", 401, "UNAUTHENTICATED");
    if (req.user.role === "SUPER_ADMIN") return next();

    const permissionKey = moduleActionForRequest(req);
    if (permissionKey) {
      if (await hasPermission(req.user, permissionKey, req)) return next();
      throw new AuthError("You do not have permission to perform this action", 403, "INSUFFICIENT_PERMISSIONS");
    }

    const { roleNames } = await getEffectiveRoleIds(req.user);
    if (allowedRoles.some((role) => roleNames.has(role))) return next();

    throw new AuthError("You do not have permission to perform this action", 403, "INSUFFICIENT_PERMISSIONS");
  } catch (error) {
    next(error);
  }
};

const requirePermission = (permissionKey) => async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthError("Authentication required", 401, "UNAUTHENTICATED");
    }

    if (await hasPermission(req.user, permissionKey, req)) return next();

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
  getEffectiveRoleIds,
  hasPermission,
  moduleActionForRequest,
};
