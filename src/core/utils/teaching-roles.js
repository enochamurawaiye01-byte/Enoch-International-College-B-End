const TEACHING_ROLES = new Set(["TEACHER", "CLASS_TEACHER", "SUBJECT_TEACHER", "SENIOR_TEACHER"]);

const isTeachingAccount = (user) => TEACHING_ROLES.has(user?.role);

module.exports = { TEACHING_ROLES, isTeachingAccount };
