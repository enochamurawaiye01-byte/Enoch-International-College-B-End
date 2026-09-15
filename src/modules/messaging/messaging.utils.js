const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "BURSAR", "TEACHER", "STAFF", "STUDENT", "PARENT"]);
const canMessage = (senderRole, receiverRole) => allowedRoles.has(senderRole) && allowedRoles.has(receiverRole);
module.exports = { canMessage };
