const { hashPassword } = require("../../core/utils/hash");
const publicUserSelect = { id: true, schoolId: true, fullName: true, email: true, phoneNumber: true, role: true, status: true, lastLoginAt: true, createdAt: true, updatedAt: true };
const hashNewPassword = (password) => hashPassword(password);
const normalizeQuery = (query) => ({ page: Math.max(Number(query.page) || 1, 1), limit: Math.min(Math.max(Number(query.limit) || 20, 1), 100), search: query.search?.trim() || undefined, role: query.role, status: query.status });
module.exports = { publicUserSelect, hashNewPassword, normalizeQuery };
