const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const { TEACHING_ROLES } = require("../../core/utils/teaching-roles");
const classRepository = require("../classes/class.repository");
const { prisma } = require("../../config/database");

const router = express.Router();
router.use(authenticate);

router.get("/teacher", requireRoles(...TEACHING_ROLES, "STAFF"), async (req, res, next) => {
    try {
        const staff = await prisma.staff.findUnique({ where: { userId: req.user.userId }, include: { teacherAssignments: { include: { subject: true, class: true } } } });
        if (!staff) return res.status(404).json({ success: false, message: "Teacher profile not found" });
        const classIds = await classRepository.findTeacherClassIds(req.user.userId, req.user.schoolId, req.user.role);
        const classSubjects = classIds.length
            ? await prisma.classSubject.findMany({ where: { classId: { in: classIds } }, select: { subjectId: true } })
            : [];
        const subjectIds = new Set([
            ...staff.teacherAssignments.map((item) => item.subjectId),
            ...classSubjects.map((item) => item.subjectId),
        ]);
        const totalStudents = classIds.length
            ? await prisma.student.count({
                where: {
                    OR: [
                        { currentClassId: { in: classIds } },
                        { enrollments: { some: { classId: { in: classIds }, status: "ACTIVE", session: { isActive: true } } } },
                    ],
                },
            })
            : 0;
        res.json({
            success: true,
            data: {
                assignedClasses: classIds.length,
                assignedSubjects: subjectIds.size,
                totalStudents,
                pendingAssignments: await prisma.assignment.count({ where: { staffId: staff.id, status: "PUBLISHED" } }),
                upcomingExaminations: 0,
            },
        });
    } catch (error) { next(error); }
});

router.get("/student", requireRoles("STUDENT"), async (req, res, next) => {
    try {
        const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
        if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });
        res.json({ success: true, data: { attendanceRate: null, pendingAssignments: await prisma.assignmentSubmission.count({ where: { studentId: student.id, status: "SUBMITTED" } }), upcomingExaminations: await prisma.examAttempt.count({ where: { studentId: student.id, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } }), outstandingFees: (await prisma.studentFeeAccount.aggregate({ where: { studentId: student.id }, _sum: { balance: true } }))._sum.balance || 0 } });
    } catch (error) { next(error); }
});

router.get("/parent", requireRoles("PARENT"), async (req, res, next) => {
    try {
        const parent = await prisma.parent.findUnique({ where: { userId: req.user.userId }, include: { parentLinks: true } });
        if (!parent) return res.status(404).json({ success: false, message: "Parent profile not found" });
        res.json({ success: true, data: { totalChildren: parent.parentLinks.length, outstandingFees: 0, averageAttendance: null } });
    } catch (error) { next(error); }
});

module.exports = router;
