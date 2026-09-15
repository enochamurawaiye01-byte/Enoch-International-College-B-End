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
            currentClass: true,
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

const findById = async (id) => prisma.student.findUnique({ where: { id }, include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } }, parentLinks: { include: { parent: true } }, enrollments: true, promotions: true } });
const findAll = async () => prisma.student.findMany({ include: { user: { select: userSelect }, currentClass: { include: { classLevel: true } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
const findUserByEmail = async (email) => prisma.user.findUnique({ where: { email } });
const findClassById = async (id) => prisma.class.findUnique({ where: { id } });

module.exports = {
    findByRegistrationNumber,
    findByUserId,
    updateStudent,
    findById,
    findAll,
    findUserByEmail,
    findClassById,
};