const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const { prisma } = require("../../config/database");

const router = express.Router();
router.use(authenticate);

router.get("/teacher", requireRoles("TEACHER", "STAFF"), async (req, res, next) => {
    try {
        const staff = await prisma.staff.findUnique({ where: { userId: req.user.userId }, include: { teacherAssignments: { include: { subject: true, class: true } } } });
        if (!staff) return res.status(404).json({ success: false, message: "Teacher profile not found" });
        const classIds = staff.teacherAssignments.map((item) => item.classId);
        res.json({ success: true, data: { assignedClasses: new Set(classIds).size, assignedSubjects: new Set(staff.teacherAssignments.map((item) => item.subjectId)).size, totalStudents: classIds.length ? await prisma.student.count({ where: { currentClassId: { in: classIds } } }) : 0, pendingAssignments: await prisma.assignment.count({ where: { staffId: staff.id, status: "PUBLISHED" } }), upcomingExaminations: 0 } });
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
