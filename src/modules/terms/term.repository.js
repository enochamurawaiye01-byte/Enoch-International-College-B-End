const { prisma } = require("../../config/database");

const createTerm = async (data) => {
  return prisma.term.create({
    data,
  });
};

const findAllTerms = async (sessionId) => {
  return prisma.term.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      startDate: "asc",
    },
  });
};
const findSessionById = async (sessionId) => {
  return prisma.academicSession.findUnique({
    where: {
      id: sessionId,
    },
  });
};
const findTermById = async (id) => {
  return prisma.term.findUnique({
    where: {
      id,
    },
  });
};

const findTermBySessionAndType = async (sessionId, type) => {
  return prisma.term.findUnique({
    where: {
      sessionId_type: {
        sessionId,
        type,
      },
    },
  });
};

const findActiveTermBySession = async (sessionId) => {
  return prisma.term.findFirst({
    where: {
      sessionId,
      isActive: true,
    },
  });
};

const findOverlappingTerm = async (
  sessionId,
  startDate,
  endDate,
  excludeId = null,
) => {
  return prisma.term.findFirst({
    where: {
      sessionId,

      ...(excludeId && {
        id: {
          not: excludeId,
        },
      }),

      startDate: {
        lt: endDate,
      },

      endDate: {
        gt: startDate,
      },
    },
  });
};

const updateTerm = async (id, data) => {
  return prisma.term.update({
    where: {
      id,
    },
    data,
  });
};

const deleteTerm = async (id) => {
  return prisma.term.delete({
    where: {
      id,
    },
  });
};
const closeTerm = async (id) => {
    return prisma.term.update({
        where: {
            id,
        },
        data: {
            isActive: false,
        },
    });
};
module.exports = {
    createTerm,
    findAllTerms,
    findTermById,
    findTermBySessionAndType,
    findActiveTermBySession,
    findOverlappingTerm,
    findSessionById,
    updateTerm,
    deleteTerm,
    closeTerm,
};