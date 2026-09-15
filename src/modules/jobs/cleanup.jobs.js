const { prisma } = require("../../config/database");

const cleanupExpiredSessions = () => prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
const markOverdueInvoices = () => prisma.invoice.updateMany({ where: { dueDate: { lt: new Date() }, status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, data: { status: "OVERDUE" } });

module.exports = { cleanupExpiredSessions, markOverdueInvoices };
