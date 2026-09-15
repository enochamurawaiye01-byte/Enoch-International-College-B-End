const { prisma } = require("../../config/database");

const markOverdueFeeAccounts = () => prisma.studentFeeAccount.updateMany({ where: { dueDate: { lt: new Date() }, status: { in: ["PENDING", "PARTIAL"] } }, data: { status: "OVERDUE" } });

module.exports = { markOverdueFeeAccounts };
