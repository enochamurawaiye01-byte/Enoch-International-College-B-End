const repository = require("./transcript.repository");
const { prisma } = require("../../config/database");
const NotFoundError = require("../../core/errors/NotFoundError");
const { calculateGrade } = require("../results/result.service");

const getCsv = async (query) => {
    const where = {};
    if (query.studentId) where.id = query.studentId;
    if (query.classId) where.currentClassId = query.classId;
    const students = await repository.findStudents(where);
    const lines = ["Student,Registration Number,Class,Subject,Exam,Session,Term,Score,Total Marks,Percentage,Status"];
    for (const student of students) for (const result of student.results) lines.push([`${student.firstName} ${student.lastName}`, student.registrationNumber, student.currentClass?.name || "", result.exam.subject.name, result.exam.title, result.session.name, result.term.name, result.score, result.totalMarks, result.percentage, result.status].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    return lines.join("\r\n");
};

const getStudentTranscript = async (studentId) => {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            user: { select: { email: true, phoneNumber: true } },
            currentClass: true,
            results: {
                include: {
                    exam: { include: { subject: true, class: true } },
                    session: true,
                    term: true,
                },
                orderBy: { generatedAt: "asc" },
            },
            reportCards: {
                include: {
                    session: true,
                    term: true,
                    entries: { include: { subject: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!student) {
        throw new NotFoundError("Student not found");
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
        reportCards: student.reportCards,
        generatedAt: new Date().toISOString(),
    };
};

module.exports = { getCsv, getStudentTranscript };