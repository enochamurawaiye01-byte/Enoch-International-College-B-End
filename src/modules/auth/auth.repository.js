// Auth repository
const { prisma } = require("../../config/database");

// ======================================================
// User Queries
// ======================================================

const authUserSelect = {
    id: true,
    fullName: true,
    email: true,
    phoneNumber: true,
    passwordHash: true,
    schoolId: true,
    role: true,
    status: true,
    hasCompletedFirstLogin: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    student: true,
    staff: true,
    parent: true,
};

const findUserByEmail = async (email) => {
    return prisma.user.findUnique({
        where: {
            email: email.toLowerCase(),
        },
    });
};

const findUserById = async (userId) => {
    return prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
};

const findUserWithAuthDataByEmail = async (email) => {
    return prisma.user.findUnique({
        where: {
            email: email.toLowerCase(),
        },
        select: authUserSelect,
    });
};

const findStudentWithAuthDataByRegistrationNumber = async (registrationNumber) => {
    const student = await prisma.student.findUnique({
        where: { registrationNumber },
        select: {
            id: true,
            registrationNumber: true,
            status: true,
            user: { select: authUserSelect },
        },
    });
    return student?.user ? { ...student.user, student: { id: student.id, status: student.status, registrationNumber: student.registrationNumber } } : null;
};

// ======================================================
// User Creation
// ======================================================

const createUser = async (data) => {
    return prisma.user.create({
        data,
    });
};

// ======================================================
// Login Tracking
// ======================================================

const updateLastLogin = async (userId) => {
    return prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            lastLoginAt: new Date(),
        },
    });
};

const markFirstLoginComplete = async (userId) => {
    await prisma.user.update({
        where: { id: userId },
        data: { hasCompletedFirstLogin: true },
    });
};

// ======================================================
// Sessions
// ======================================================

const createSession = async (data) => {
    return prisma.userSession.create({
        data,
    });
};

const findSessionByToken = async (token) => {
    return prisma.userSession.findUnique({
        where: {
            token,
        },
        include: {
            user: true,
        },
    });
};

const deleteSessionByToken = async (token) => {
    return prisma.userSession.delete({
        where: {
            token,
        },
    });
};

const deleteAllUserSessions = async (userId) => {
    return prisma.userSession.deleteMany({
        where: {
            userId,
        },
    });
};

const countUserSessions = async (userId) => {
    return prisma.userSession.count({
        where: {
            userId,
            expiresAt: {
                gt: new Date(),
            },
        },
    });
};

const deleteExpiredSessions = async () => {
    return prisma.userSession.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });
};

// ======================================================
// Exports
// ======================================================

module.exports = {
    findUserByEmail,
    findUserById,
    findUserWithAuthDataByEmail,
    findStudentWithAuthDataByRegistrationNumber,
    createUser,
    updateLastLogin,
    markFirstLoginComplete,
    createSession,
    findSessionByToken,
    deleteSessionByToken,
    deleteAllUserSessions,
    countUserSessions,
    deleteExpiredSessions,
};