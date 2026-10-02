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

const withCurrentStudentCounts = async (classes) => {
    if (!classes.length) return classes;
    const classIds = classes.map(({ id }) => id);
    const [currentStudents, activeEnrollments] = await Promise.all([
        prisma.student.findMany({ where: { currentClassId: { in: classIds } }, select: { id: true, currentClassId: true } }),
        prisma.enrollment.findMany({
            where: { classId: { in: classIds }, status: "ACTIVE", session: { isActive: true } },
            select: { studentId: true, classId: true },
        }),
    ]);
    const studentIdsByClass = new Map(classIds.map((id) => [id, new Set()]));
    currentStudents.forEach(({ id, currentClassId }) => studentIdsByClass.get(currentClassId)?.add(id));
    activeEnrollments.forEach(({ studentId, classId }) => studentIdsByClass.get(classId)?.add(studentId));
    return classes.map((schoolClass) => ({
        ...schoolClass,
        _count: { ...schoolClass._count, students: studentIdsByClass.get(schoolClass.id)?.size || 0 },
    }));
};

// Get all classes/arms
const findAllClasses = async (classIds) => {
    const classes = await prisma.class.findMany({
        where: classIds ? { id: { in: classIds } } : undefined,
        include: {
            classLevel: true,
            _count: { select: { students: true } },
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
    return withCurrentStudentCounts(classes);
};

const findAllClassLevels = () => prisma.classLevel.findMany({
    include: { _count: { select: { classes: true } } },
    orderBy: { name: "asc" }
});

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

const findClassesByLevel = async (classLevelId) => {
    const classes = await prisma.class.findMany({
        where: { classLevelId },
        include: { classLevel: true, _count: { select: { students: true } } },
        orderBy: { arm: "asc" },
    });
    return withCurrentStudentCounts(classes);
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
const findStudents = (classId) => prisma.student.findMany({
    where: {
        OR: [
            { currentClassId: classId },
            { enrollments: { some: { classId, status: "ACTIVE", session: { isActive: true } } } },
        ],
    },
    include: { user: { select: { email: true, phoneNumber: true, status: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
});
const findTeacherAssignment = async (userId, classId) => {
    const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
    if (!staff) return null;
    const [subjectAssignment, classAssignment] = await Promise.all([
        prisma.teacherAssignment.findFirst({ where: { classId, staffId: staff.id }, select: { id: true } }),
        prisma.classTeacherAssignment.findFirst({ where: { classId, staffId: staff.id }, select: { id: true } })
    ]);
    return subjectAssignment || classAssignment;
};
const findTeacherClassIds = async (userId) => {
    const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
    if (!staff) return [];
    const [subjectAssignments, classAssignments] = await Promise.all([
        prisma.teacherAssignment.findMany({ where: { staffId: staff.id }, select: { classId: true } }),
        prisma.classTeacherAssignment.findMany({ where: { staffId: staff.id }, select: { classId: true } })
    ]);
    return [...new Set([...subjectAssignments, ...classAssignments].map((assignment) => assignment.classId))];
};

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
    findTeacherClassIds,
    findAllClassLevels,
    findClassById,
    findClassesByLevel,
    findClassLevelByName,
    findClassByLevelAndArm,
    updateClass,
    findClassUsage,
    findStudents,
    deleteClass,
};