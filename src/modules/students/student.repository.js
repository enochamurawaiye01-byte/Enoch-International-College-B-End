const { prisma } = require("../../config/database");

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
            currentClass: true,
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

const findById = async (id) => prisma.student.findUnique({ where: { id }, include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } }, desiredDepartment: true, parentLinks: { include: { parent: true } }, enrollments: { include: { session: true, term: true, department: true, class: { include: { classLevel: true } } } }, promotions: true, reportCards: { where: { published: true }, include: { session: true, term: true, entries: { include: { subject: true } } }, orderBy: [{ session: { startDate: "desc" } }, { term: { type: "desc" } }] } } });
const findAll = async ({ schoolId, search, classId, classIds, status } = {}) => {
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
    return prisma.student.findMany({
    where: {
        ...(status ? { status } : {}),
        ...(schoolId ? { user: { schoolId } } : {}),
        ...(conditions.length ? { AND: conditions } : {})
    },
    include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });
};
const findUserByEmail = async (email) => prisma.user.findUnique({ where: { email } });
const findClassById = async (id) => prisma.class.findUnique({ where: { id } });
const findTeacherClassIds = async (userId) => {
    const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
    if (!staff) return [];
    const [subjectAssignments, classAssignments] = await Promise.all([
        prisma.teacherAssignment.findMany({ where: { staffId: staff.id }, select: { classId: true } }),
        prisma.classTeacherAssignment.findMany({ where: { staffId: staff.id }, select: { classId: true } })
    ]);
    return [...new Set([...subjectAssignments, ...classAssignments].map((assignment) => assignment.classId))];
};
const isTeacherAssignedToClass = async (userId, classId) => (await findTeacherClassIds(userId)).includes(classId);
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
    isTeacherAssignedToClass,
    updateProfileImage,
};