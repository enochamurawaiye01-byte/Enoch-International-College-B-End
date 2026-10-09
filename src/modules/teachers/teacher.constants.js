const TEACHER_ROLES = Object.freeze(["SUPER_ADMIN", "ADMIN"]);
const canViewTeacherApplications = (role) => TEACHER_ROLES.includes(role);

module.exports = { TEACHER_ROLES, canViewTeacherApplications };
