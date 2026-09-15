// AcademicSession repository
const { prisma } = require("../../config/database");

// ======================================================
// Find Methods
// ======================================================

const findAll = async (schoolId) => {
    return prisma.academicSession.findMany({
        where: {
            schoolId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const findById = async (id, schoolId) => {
    return prisma.academicSession.findFirst({
        where: {
            id,
            schoolId,
        },
    });
};

const findByName = async (schoolId, name) => {
    return prisma.academicSession.findUnique({
        where: {
            schoolId_name: {
                schoolId,
                name,
            },
        },
    });
};
const findActiveSession = async () => {
    return prisma.academicSession.findFirst({
        where: {
            isActive: true,
        },
    });
};

// ======================================================
// Create
// ======================================================

const create = async (data) => {
    return prisma.academicSession.create({
        data,
    });
};

// ======================================================
// Update
// ======================================================

const update = async (id, data) => {
    return prisma.academicSession.update({
        where: {
            id,
        },
        data,
    });
};

// ======================================================
// Delete
// ======================================================

const remove = async (id) => {
    return prisma.academicSession.delete({
        where: {
            id,
        },
    });
};

// ======================================================
// Bulk Update
// ======================================================

const deactivateAllSessions = async (schoolId) => {
    return prisma.academicSession.updateMany({
        where: {
            schoolId,
        },
        data: {
            isActive: false,
        },
    });
};

module.exports = {
    findAll,
    findById,
    findByName,
    findActiveSession,
    create,
    update,
    remove,
    deactivateAllSessions,
};