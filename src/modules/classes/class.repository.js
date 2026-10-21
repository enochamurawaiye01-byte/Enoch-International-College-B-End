const { prisma } = require("../../config/database");

const currentClassTeacherInclude = (schoolId) => ({
    classTeacherAssignments: {
        where: { session: { isActive: true, ...(schoolId ? { schoolId } : {}) } },
        include: {
            staff: { select: { id: true, firstName: true, lastName: true, user: { select: { fullName: true } } } },
            session: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
    },
});

const withCurrentClassTeacher = (schoolClass) => ({
    ...schoolClass,
    classTeacher: schoolClass.classTeacherAssignments?.[0]
        ? {
            id: schoolClass.classTeacherAssignments[0].staff.id,
            fullName: schoolClass.classTeacherAssignments[0].staff.user.fullName,
            session: schoolClass.classTeacherAssignments[0].session,
        }
        : null,
});

// Create a class/arm
const createClass = async (data) => {
    return prisma.$transaction(async (tx) => {
        const schoolClass = await tx.class.create({ data, include: { classLevel: true } });
        const targets = await tx.subjectTarget.findMany({
            where: { classLevelId: schoolClass.classLevelId, subject: { isActive: true } },
            select: { subjectId: true },
        });
        const subjectIds = [...new Set(targets.map(({ subjectId }) => subjectId))];
        if (subjectIds.length) {
            await tx.classSubject.createMany({
                data: subjectIds.map((subjectId) => ({ classId: schoolClass.id, subjectId })),
                skipDuplicates: true,
            });
        }
        return schoolClass;
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
const findAllClasses = async (classIds, schoolId) => {
    const classes = await prisma.class.findMany({
        where: classIds ? { id: { in: classIds } } : undefined,
        include: {
            classLevel: true,
            _count: { select: { students: true } },
            ...currentClassTeacherInclude(schoolId),
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
    return withCurrentStudentCounts(classes.map(withCurrentClassTeacher));
};

const findAllClassLevels = () => prisma.classLevel.findMany({
    include: { _count: { select: { classes: true } } },
    orderBy: { name: "asc" }
});

// Find one class by ID
const findClassById = async (id, schoolId) => {
    const schoolClass = await prisma.class.findUnique({
        where: {
            id,
        },
        include: {
            classLevel: true,
            ...currentClassTeacherInclude(schoolId),
        },
    });
    return schoolClass ? withCurrentClassTeacher(schoolClass) : null;
};

const findClassesByLevel = async (classLevelId, schoolId, classIds) => {
    const classes = await prisma.class.findMany({
        where: { classLevelId, ...(classIds ? { id: { in: classIds } } : {}) },
        include: { classLevel: true, _count: { select: { students: true } }, ...currentClassTeacherInclude(schoolId) },
        orderBy: { arm: "asc" },
    });
    return withCurrentStudentCounts(classes.map(withCurrentClassTeacher));
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
            {
                currentClassId: null,
                enrollments: { some: { classId, status: "ACTIVE", session: { isActive: true } } },
            },
        ],
    },
    include: { user: { select: { email: true, phoneNumber: true, status: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
});
const findTeacherAssignment = async (userId, classId, schoolId, userRole) => {
    const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
    if (!staff) return null;
    const activeSessions = await prisma.academicSession.findMany({
        where: { isActive: true, ...(schoolId ? { schoolId } : {}) },
        select: { id: true }
    });
    const activeSessionIds = activeSessions.map(({ id }) => id);
    const classAssignments = await prisma.classTeacherAssignment.findMany({
        where: {
            staffId: staff.id,
            session: { isActive: true, ...(schoolId ? { schoolId } : {}) }
        },
        select: { id: true, classId: true }
    });
    if (classAssignments.length) return classAssignments.find((assignment) => assignment.classId === classId) || null;
    if (userRole === "CLASS_TEACHER") return null;
    return prisma.teacherAssignment.findFirst({
        where: {
            classId,
            staffId: staff.id,
            OR: [{ sessionId: null }, ...(activeSessionIds.length ? [{ sessionId: { in: activeSessionIds } }] : [])]
        },
        select: { id: true }
    });
};
const findTeacherClassIds = async (userId, schoolId, userRole) => {
    const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
    if (!staff) return [];
    const activeSessions = await prisma.academicSession.findMany({
        where: { isActive: true, ...(schoolId ? { schoolId } : {}) },
        select: { id: true }
    });
    const activeSessionIds = activeSessions.map(({ id }) => id);
    const classAssignments = await prisma.classTeacherAssignment.findMany({
        where: {
            staffId: staff.id,
            session: { isActive: true, ...(schoolId ? { schoolId } : {}) }
        },
        select: { classId: true }
    });
    if (classAssignments.length) return [...new Set(classAssignments.map((assignment) => assignment.classId))];
    if (userRole === "CLASS_TEACHER") return [];

    const subjectAssignments = await prisma.teacherAssignment.findMany({
        where: {
            staffId: staff.id,
            OR: [{ sessionId: null }, ...(activeSessionIds.length ? [{ sessionId: { in: activeSessionIds } }] : [])]
        },
        select: { classId: true }
    });

    return [...new Set(subjectAssignments.map((assignment) => assignment.classId))];
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
    findTeacherAssignment,
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