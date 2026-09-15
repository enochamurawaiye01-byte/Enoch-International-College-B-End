const { prisma } = require("../../config/database");

const findClassById = (id) => prisma.class.findUnique({ where: { id } });
const findSubjectById = (id) => prisma.subject.findUnique({ where: { id } });

const findByClassAndSubject = (classId, subjectId) =>
    prisma.classSubject.findUnique({
        where: { classId_subjectId: { classId, subjectId } },
    });

const create = (data) => prisma.classSubject.create({
    data,
    include: { class: { include: { classLevel: true } }, subject: true },
});

const findAll = (classId) => prisma.classSubject.findMany({
    where: classId ? { classId } : undefined,
    include: { class: { include: { classLevel: true } }, subject: true },
    orderBy: { createdAt: "desc" },
});

const findById = (id) => prisma.classSubject.findUnique({
    where: { id },
    include: { class: { include: { classLevel: true } }, subject: true },
});

const remove = (id) => prisma.classSubject.delete({ where: { id } });

module.exports = {
    findClassById,
    findSubjectById,
    findByClassAndSubject,
    create,
    findAll,
    findById,
    remove,
};