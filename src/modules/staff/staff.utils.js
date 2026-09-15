const { hashPassword } = require("../../core/utils/hash");
const buildUser = async (data, schoolId, role) => ({ schoolId: schoolId || null, fullName: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" "), email: data.email.toLowerCase(), phoneNumber: data.phoneNumber || null, passwordHash: await hashPassword(data.password), role, status: "ACTIVE" });
module.exports = { buildUser };
