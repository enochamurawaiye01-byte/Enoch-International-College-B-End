const repository = require("./transcript.repository");
const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const classRepository = require("../classes/class.repository");
const { calculateGrade } = require("../results/result.service");
const { isTeachingAccount } = require("../../core/utils/teaching-roles");

const getCsv = async (query, user) => {
    const where = {};
    if (user?.role !== "SUPER_ADMIN") {
        if (!user?.schoolId) throw new AppError("A school-scoped account is required to export transcripts.", 403, "TRANSCRIPT_ACCESS_DENIED");
        where.user = { schoolId: user.schoolId };
    }
    if (query.studentId) where.id = query.studentId;
    if (query.classId) where.currentClassId = query.classId;
    const students = await repository.findStudents(where);
    const lines = ["Student,Registration Number,Class,Subject,Exam,Session,Term,Score,Total Marks,Percentage,Status"];
    for (const student of students) for (const result of student.results) lines.push([`${student.firstName} ${student.lastName}`, student.registrationNumber, result.exam.class?.name || "", result.exam.subject.name, result.exam.title, result.session.name, result.term.name, result.score, result.totalMarks, result.percentage, result.status].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    return lines.join("\r\n");
};

const getStudentTranscript = async (studentId, user) => {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            user: {
                select: {
                    id: true,
                    schoolId: true,
                    email: true,
                    phoneNumber: true,
                    school: { select: { name: true, motto: true, address: true, city: true, state: true, phone: true, email: true, logoUrl: true } }
                }
            },
            currentClass: true,
            enrollments: {
                where: { status: "ACTIVE", session: { isActive: true } },
                select: { classId: true },
            },
            results: {
                ...(user?.role !== "SUPER_ADMIN" ? { where: { session: { schoolId: user?.schoolId } } } : {}),
                include: {
                    exam: { include: { subject: true, class: { include: { classLevel: true } } } },
                    session: true,
                    term: true,
                },
                orderBy: { generatedAt: "asc" },
            },
            reportCards: {
                where: {
                    ...(user?.role !== "SUPER_ADMIN" ? { session: { schoolId: user?.schoolId } } : {}),
                    ...(user?.role === "STUDENT" ? { studentPublished: true } : {})
                },
                include: {
                    session: true,
                    term: true,
                    class: { include: { classLevel: true } },
                    entries: { include: { subject: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!student) {
        throw new NotFoundError("Student not found");
    }
    if (user?.role !== "SUPER_ADMIN" && !user?.schoolId) {
        throw new AppError("A school-scoped account is required to view transcripts.", 403, "TRANSCRIPT_ACCESS_DENIED");
    }
    if (user?.role === "STUDENT" && student.user?.id !== user.userId) {
        throw new AppError("You can only view your own transcript.", 403, "TRANSCRIPT_ACCESS_DENIED");
    }
    if (user?.role !== "SUPER_ADMIN" && student.user?.schoolId !== user.schoolId) {
        throw new AppError("You cannot access a student from another school.", 403, "TRANSCRIPT_ACCESS_DENIED");
    }
    if (isTeachingAccount(user)) {
        const assignedClassIds = await classRepository.findTeacherClassIds(user.userId, user.schoolId, user.role);
        const transcriptClassIds = new Set([
            student.currentClassId,
            ...student.enrollments.map((enrollment) => enrollment.classId),
        ].filter(Boolean));
        if (!assignedClassIds.some((classId) => transcriptClassIds.has(classId))) {
            throw new AppError("You can only review transcripts for students in your assigned classes.", 403, "TRANSCRIPT_ACCESS_DENIED");
        }
        student.results = student.results.filter((result) => assignedClassIds.includes(result.exam.classId));
        student.reportCards = student.reportCards.filter((reportCard) => assignedClassIds.includes(reportCard.classId));

        if (user.role === "SUBJECT_TEACHER") {
            const staff = await prisma.staff.findUnique({ where: { userId: user.userId }, select: { id: true } });
            const assignments = staff
                ? await prisma.teacherAssignment.findMany({
                    where: { staffId: staff.id },
                    select: { classId: true, subjectId: true, sessionId: true, termId: true }
                })
                : [];
            const matchesAssignment = (record, classId) => assignments.some((assignment) =>
                assignment.classId === classId
                && assignment.subjectId === record.subjectId
                && (!assignment.sessionId || assignment.sessionId === record.sessionId)
                && (!assignment.termId || assignment.termId === record.termId)
            );
            student.results = student.results.filter((result) =>
                matchesAssignment({
                    subjectId: result.exam.subjectId,
                    sessionId: result.sessionId,
                    termId: result.termId
                }, result.exam.classId)
            );
            student.reportCards = student.reportCards.map((reportCard) => ({
                ...reportCard,
                entries: reportCard.entries.filter((entry) =>
                    matchesAssignment({
                        subjectId: entry.subjectId,
                        sessionId: reportCard.sessionId,
                        termId: reportCard.termId
                    }, reportCard.classId)
                )
            })).filter((reportCard) => reportCard.entries.length > 0);
        }
    } else if (user?.role !== "STUDENT") {
        const canViewTranscript = ["SUPER_ADMIN", "ADMIN", "HEAD_TEACHER"].includes(user?.role)
            || await require("../../core/middleware/authorization.middleware").hasPermission(user, "transcripts:view");
        if (!canViewTranscript) {
            throw new AppError("You cannot view student transcripts.", 403, "TRANSCRIPT_ACCESS_DENIED");
        }
    }

    let totalScoreSum = 0;
    let totalScoreCount = 0;

    const resultsBySession = {};
    student.results.forEach((result) => {
        const sessionKey = result.session?.name || "Unknown Session";
        const termKey = result.term?.name || "Unknown Term";

        if (!resultsBySession[sessionKey]) {
            resultsBySession[sessionKey] = {};
        }
        if (!resultsBySession[sessionKey][termKey]) {
            resultsBySession[sessionKey][termKey] = [];
        }

        const scoreNum = Number(result.score);
        totalScoreSum += Number(result.percentage);
        totalScoreCount += 1;

        resultsBySession[sessionKey][termKey].push({
            subject: result.exam?.subject?.name || "Subject",
            class: result.exam?.class?.name || "N/A",
            examTitle: result.exam?.title,
            score: scoreNum,
            totalMarks: Number(result.totalMarks),
            percentage: Number(result.percentage),
            grade: result.grade || calculateGrade(result.percentage),
            status: result.status,
            position: result.position,
        });
    });

    const cumulativeAverage = totalScoreCount ? Math.round((totalScoreSum / totalScoreCount) * 100) / 100 : 0;
    const overallGrade = calculateGrade(cumulativeAverage);

    return {
        student: {
            id: student.id,
            registrationNumber: student.registrationNumber,
            admissionNumber: student.admissionNumber,
            fullName: `${student.firstName} ${student.lastName}`,
            gender: student.gender,
            currentClass: student.currentClass?.name || "N/A",
            admissionDate: student.admissionDate,
            email: student.user?.email,
        },
        cumulativeAverage,
        overallGrade,
        sessions: resultsBySession,
        school: student.user?.school || null,
        reportCards: student.reportCards,
        generatedAt: new Date().toISOString(),
    };
};

module.exports = { getCsv, getStudentTranscript };
