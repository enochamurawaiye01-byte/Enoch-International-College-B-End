const { prisma } = require("../../config/database");

// Create a class/arm
const createClass = async (data) => {
    return prisma.class.create({
        data,
        include: {
            classLevel: true,
        },
    });
};

// Get all classes/arms
const findAllClasses = async () => {
    return prisma.class.findMany({
        include: {
            classLevel: true,
        },
        orderBy: [
            {
                classLevel: {
                    name: "asc",
                },
            },
            {
                arm: "asc",
            },
        ],
    });
};

// Find one class by ID
const findClassById = async (id) => {
    return prisma.class.findUnique({
        where: {
            id,
        },
        include: {
            classLevel: true,
        },
    });
};

// Find class level by name
const findClassLevelByName = async (name) => {
    return prisma.classLevel.findUnique({
        where: {
            name,
        },
    });
};

// Find a class using class level + arm
const findClassByLevelAndArm = async (classLevelId, arm) => {
    return prisma.class.findUnique({
        where: {
            classLevelId_arm: {
                classLevelId,
                arm,
            },
        },
    });
};

// Update class
const updateClass = async (id, data) => {
    return prisma.class.update({
        where: {
            id,
        },
        data,
        include: {
            classLevel: true,
        },
    });
};

// Check whether a class is being used
const findClassUsage = async (id) => {
    return prisma.class.findUnique({
        where: {
            id,
        },
        select: {
            _count: {
                select: {
                    students: true,
                    enrollments: true,
                    classSubjects: true,
                    teacherAssignments: true,
                    feeStructures: true,
                    timetable: true,
                    exams: true,
                    promotionsFrom: true,
                    promotionsTo: true,
                },
            },
        },
    });
};

// Delete class
const findStudents = (classId) => prisma.student.findMany({ where: { currentClassId: classId }, include: { user: { select: { email: true, phoneNumber: true, status: true } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
const findTeacherAssignment = (userId, classId) => prisma.teacherAssignment.findFirst({ where: { classId, staff: { userId } } });

const deleteClass = async (id) => {
    return prisma.class.delete({
        where: {
            id,
        },
    });
};

module.exports = {
    createClass,
    findAllClasses,
    findClassById,
    findClassLevelByName,
    findClassByLevelAndArm,
    updateClass,
    findClassUsage,
    findStudents,
    deleteClass,
};