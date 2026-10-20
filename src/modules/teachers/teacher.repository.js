const { prisma } = require("../../config/database");
const { TEACHING_ROLES } = require("../../core/utils/teaching-roles");
const include = { user: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, status: true } }, department: true, teacherAssignments: { include: { subject: true, class: { include: { classLevel: true } } } }, classTeacherAssignments: { include: { class: { include: { classLevel: true } }, session: true } }, lessons: true, assignments: true, timetableSlots: { include: { timetable: true, subject: true } } };
const findById = (id) => prisma.staff.findUnique({ where: { id }, include });
const findByUserId = (userId) => prisma.staff.findUnique({ where: { userId }, include });
const findAll = () => prisma.staff.findMany({
 where: {
  user: {
   OR: [
    { role: { in: [...TEACHING_ROLES] } },
    {
     roleAssignments: {
      some: {
       status: "ACTIVE",
       role: { name: "CLASS_TEACHER", isActive: true }
      }
     }
    }
   ]
  }
 },
 include: {
  ...include,
  user: {
   ...include.user,
   roleAssignments: {
    where: { status: "ACTIVE" },
    select: { role: { select: { name: true } } }
   }
  }
 },
 orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
});
const updateProfileImage = (id, profileImageUrl) => prisma.staff.update({ where: { id }, data: { profileImageUrl }, include });
module.exports = { findById, findByUserId, findAll, updateProfileImage };
