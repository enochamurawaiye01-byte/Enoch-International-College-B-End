const { prisma } = require("../../config/database");
const classRepository = require("../classes/class.repository");

const userSelect = {
    id: true,
    schoolId: true,
    fullName: true,
    email: true,
    phoneNumber: true,
    role: true,
    status: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
};

const findByRegistrationNumber = async (registrationNumber) =>
    prisma.student.findUnique({
        where: { registrationNumber },
        include: {
            user: {
                select: userSelect,
            },
            currentClass: { include: { classLevel: true } },
            desiredDepartment: true,
        },
    });

const findByUserId = async (userId) =>
    prisma.student.findUnique({
        where: { userId },
        include: {
            user: {
                select: userSelect,
            },
            currentClass: { include: { classLevel: true } },
            desiredDepartment: true,
            enrollments: { where: { status: "ACTIVE" }, include: { session: true, term: true, department: true, class: { include: { classLevel: true } } }, orderBy: { createdAt: "desc" } },
        },
    });

const updateStudent = async (studentId, data) =>
    prisma.student.update({
        where: { id: studentId },
        data,
        include: {
            user: {
                select: userSelect,
            },
            currentClass: true,
        },
    });

const findById = async (id) => prisma.student.findUnique({ where: { id }, include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } }, desiredDepartment: true, parentLinks: { include: { parent: true } }, enrollments: { include: { session: true, term: true, department: true, class: { include: { classLevel: true } } } }, promotions: true, reportCards: { where: { studentPublished: true }, include: { session: true, term: true, entries: { include: { subject: true } } }, orderBy: [{ session: { startDate: "desc" } }, { term: { type: "desc" } }] } } });
const findAll = async ({ schoolId, search, classId, classIds, status, page = 1, pageSize = 20 } = {}) => {
    const conditions = [];
    const selectedClassIds = classId ? [classId] : classIds;
    if (selectedClassIds) conditions.push({
        OR: [
            { currentClassId: { in: selectedClassIds } },
            { enrollments: { some: { classId: { in: selectedClassIds }, status: "ACTIVE", session: { isActive: true } } } },
        ],
    });
    if (search) conditions.push({ OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { middleName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { registrationNumber: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } }
    ] });
    const where = {
        ...(status ? { status } : {}),
        ...(schoolId ? { user: { schoolId } } : {}),
        ...(conditions.length ? { AND: conditions } : {})
    };
    const [items, total] = await Promise.all([
        prisma.student.findMany({
            where,
            include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } } },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.student.count({ where }),
    ]);
    return {
        items,
        meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};
const findUserByEmail = async (email) => prisma.user.findUnique({ where: { email } });
const findClassById = async (id) => prisma.class.findUnique({ where: { id } });
const findTeacherClassIds = (userId, schoolId, userRole) => classRepository.findTeacherClassIds(userId, schoolId, userRole);
const findCurrentClassTeacher = async (classId, schoolId) => prisma.classTeacherAssignment.findFirst({
    where: {
        classId,
        session: { isActive: true, ...(schoolId ? { schoolId } : {}) },
    },
    include: {
        staff: { select: { id: true, firstName: true, lastName: true, user: { select: { fullName: true } } } },
        session: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
});
const isTeacherAssignedToClass = async (userId, classId, schoolId, userRole) => (await findTeacherClassIds(userId, schoolId, userRole)).includes(classId);
const updateProfileImage = async (studentId, profileImageUrl) => prisma.student.update({
    where: { id: studentId },
    data: { profileImageUrl },
    include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } } },
});

module.exports = {
    findByRegistrationNumber,
    findByUserId,
    updateStudent,
    findById,
    findAll,
    findUserByEmail,
    findClassById,
    findTeacherClassIds,
    findCurrentClassTeacher,
    isTeacherAssignedToClass,
    updateProfileImage,
};