// Subject repository
const prisma = require("../../config/prisma");

// Create subject
const createSubject = async (data) => {
    return prisma.subject.create({
        data,
    });
};

// Get all subjects
const findAllSubjects = async () => {
    return prisma.subject.findMany({
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
    deleteSubject,
};