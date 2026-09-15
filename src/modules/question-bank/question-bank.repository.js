const { prisma } = require("../../config/database");
const findExam = (id) => prisma.exam.findUnique({ where: { id } });
const create = (data) => prisma.question.create({ data, include: { options: true } });
const findById = (id, includeCorrectAnswers = false) => prisma.question.findUnique({ where: { id }, include: { options: includeCorrectAnswers ? true : { select: { id: true, optionKey: true, optionText: true } }, exam: true } });
const findAll = (examId) => prisma.question.findMany({ where: { examId }, include: { options: { select: { id: true, optionKey: true, optionText: true } } }, orderBy: { createdAt: "asc" } });
const update = (id, data) => prisma.question.update({ where: { id }, data, include: { options: true } });
const remove = (id) => prisma.question.delete({ where: { id } });
module.exports = { findExam, create, findById, findAll, update, remove };
