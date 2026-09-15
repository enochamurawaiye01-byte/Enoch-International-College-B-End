// Auth repository
const { prisma } = require("../../config/database");

// ======================================================
// User Queries
// ======================================================

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
     select: {
    id: true,
    fullName: true,
    email: true,
    phoneNumber: true,
    passwordHash: true,
    schoolId: true,
    role: true,
    status: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    student: true,
    staff: true,
    parent: true,
},
    });
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
    createUser,
    updateLastLogin,
    createSession,
    findSessionByToken,
    deleteSessionByToken,
    deleteAllUserSessions,
    countUserSessions,
    deleteExpiredSessions,
};