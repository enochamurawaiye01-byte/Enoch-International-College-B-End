// Subject repository
const prisma = require("../../config/prisma");

// Create subject
const createSubject = async (data) => {
    return prisma.subject.create({
        data,
    });
};

const createSubjectWithTargets = async (data, targets) => prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({ data });
    await tx.subjectTarget.createMany({
        data: targets.map((target) => ({ ...target, subjectId: subject.id })),
    });
    const classes = await tx.class.findMany({
        where: { isActive: true, classLevelId: { in: [...new Set(targets.map(({ classLevelId }) => classLevelId))] } },
        select: { id: true, classLevelId: true },
    });
    if (classes.length) {
        await tx.classSubject.createMany({
            data: classes.map((schoolClass) => ({ classId: schoolClass.id, subjectId: subject.id })),
            skipDuplicates: true,
        });
        if (subject.isActive) {
            const [classSubjects, enrollments] = await Promise.all([
                tx.classSubject.findMany({
                    where: { classId: { in: classes.map(({ id }) => id) }, subjectId: subject.id },
                    select: { id: true, classId: true },
                }),
                tx.enrollment.findMany({
                    where: { classId: { in: classes.map(({ id }) => id) }, status: "ACTIVE", session: { isActive: true } },
                    select: { id: true, classId: true, departmentId: true },
                }),
            ]);
            const classLevelById = new Map(classes.map(({ id, classLevelId }) => [id, classLevelId]));
            const classSubjectByClassId = new Map(classSubjects.map(({ id, classId }) => [classId, id]));
            const registrations = enrollments.filter((enrollment) => targets.some((target) =>
                target.classLevelId === classLevelById.get(enrollment.classId)
                && (target.departmentId == null || target.departmentId === enrollment.departmentId)
            )).map((enrollment) => ({
                enrollmentId: enrollment.id,
                classSubjectId: classSubjectByClassId.get(enrollment.classId),
            })).filter(({ classSubjectId }) => classSubjectId);
            if (registrations.length) {
                await tx.studentSubjectEnrollment.createMany({ data: registrations, skipDuplicates: true });
            }
        }
    }
    return tx.subject.findUnique({ where: { id: subject.id }, include: { department: true, targets: { include: { classLevel: true, department: true } } } });
});

// Get all subjects
const findAllSubjects = async (where) => {
    return prisma.subject.findMany({
        where,
        include: { department: true, targets: { include: { classLevel: true, department: true } } },
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
        include: { department: true, targets: { include: { classLevel: true, department: true } } },
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
                    lessons: true,
                    assignments: true,
                },
            },
        },
    });
};

const deleteSubjectSafely = async (id) => prisma.$transaction(async (tx) => {
    const subject = await tx.subject.findUnique({
        where: { id },
        select: {
            _count: {
                select: {
                    teacherAssignments: true,
                    assessments: true,
                    exams: true,
                    scores: true,
                    reportCardEntries: true,
                    timetableSlots: true,
                    lessons: true,
                    assignments: true,
                },
            },
        },
    });
    if (!subject) return { found: false, inUse: false };
    const enrollmentCount = await tx.studentSubjectEnrollment.count({
        where: { classSubject: { subjectId: id } },
    });
    const inUse = enrollmentCount > 0 || Object.values(subject._count).some((count) => count > 0);
    if (inUse) return { found: true, inUse: true };
    await tx.subject.delete({ where: { id } });
    return { found: true, inUse: false };
}, { isolationLevel: "Serializable" });

const findDepartment = (id) => prisma.department.findUnique({ where: { id } });
const findDepartments = (ids) => prisma.department.findMany({ where: { id: { in: ids } }, select: { id: true } });
const findClassLevelsByGroup = (group) => prisma.classLevel.findMany({
    where: { code: { startsWith: group } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
});
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

const deactivateSubject = (id) => prisma.subject.update({ where: { id }, data: { isActive: false } });

module.exports = {
    createSubject,
    createSubjectWithTargets,
    findAllSubjects,
    findSubjectById,
    findSubjectByName,
    findSubjectByCode,
    updateSubject,
    findSubjectUsage,
    deleteSubjectSafely,
    findDepartment,
    findDepartments,
    findClassLevelsByGroup,
    findTeacherSubjectIds,
    deleteSubject,
    deactivateSubject,
};