// Subject repository
const prisma = require("../../config/prisma");

// Create subject
const createSubject = async (data) => {
    return prisma.subject.create({
        data,
    });
};

// Get all subjects
const findAllSubjects = async (where) => {
    return prisma.subject.findMany({
        where,
        include: { department: true },
        orderBy: {
            name: "asc",
        },
    });
};

// Find subject by ID
const findSubjectById = async (id) => {
    return prisma.subject.findUnique({
        where: {
            id,
        },
        include: { department: true },
    });
};

// Find subject by name
const findSubjectByName = async (name) => {
    return prisma.subject.findFirst({
        where: {
            name: {
                equals: name,
                mode: "insensitive",
            },
        },
    });
};

// Find subject by code
const findSubjectByCode = async (code) => {
    return prisma.subject.findUnique({
        where: {
            code,
        },
    });
};

// Update subject
const updateSubject = async (id, data) => {
    return prisma.subject.update({
        where: {
            id,
        },
        data,
    });
};

// Check whether subject is being used
const findSubjectUsage = async (id) => {
    return prisma.subject.findUnique({
        where: {
            id,
        },
        select: {
            _count: {
                select: {
                    classSubjects: true,
                    teacherAssignments: true,
                    assessments: true,
                    exams: true,
                    scores: true,
                    reportCardEntries: true,
                    timetableSlots: true,
                },
            },
        },
    });
};

const findDepartment = (id) => prisma.department.findUnique({ where: { id } });
const findTeacherSubjectIds = async (userId) => {
    const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
    if (!staff) return [];
    const [subjectAssignments, classTeacherAssignments] = await Promise.all([
        prisma.teacherAssignment.findMany({ where: { staffId: staff.id }, select: { subjectId: true } }),
        prisma.classTeacherAssignment.findMany({ where: { staffId: staff.id }, include: { class: { include: { classSubjects: { select: { subjectId: true } } } } } })
    ]);
    return [...new Set([
        ...subjectAssignments.map((assignment) => assignment.subjectId),
        ...classTeacherAssignments.flatMap((assignment) => assignment.class.classSubjects.map((subject) => subject.subjectId))
    ])];
};

// Delete subject
const deleteSubject = async (id) => {
    return prisma.subject.delete({
        where: {
            id,
        },
    });
};

module.exports = {
    createSubject,
    findAllSubjects,
    findSubjectById,
    findSubjectByName,
    findSubjectByCode,
    updateSubject,
    findSubjectUsage,
    findDepartment,
    findTeacherSubjectIds,
    deleteSubject,
};