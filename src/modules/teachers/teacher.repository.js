const { prisma } = require("../../config/database");
const include = { user: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, status: true } }, department: true, teacherAssignments: { include: { subject: true, class: true } }, lessons: true, assignments: true, timetableSlots: { include: { timetable: true, subject: true } } };
const findById = (id) => prisma.staff.findUnique({ where: { id }, include });
const findByUserId = (userId) => prisma.staff.findUnique({ where: { userId }, include });
const findAll = () => prisma.staff.findMany({ where: { user: { role: "TEACHER" } }, include, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
module.exports = { findById, findByUserId, findAll };
