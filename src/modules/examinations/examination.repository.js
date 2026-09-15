const { prisma } = require("../../config/database");
const include = { session: true, term: true, class: { include: { classLevel: true } }, subject: true, _count: { select: { questions: true, attempts: true } } };
const findReferences = async (data) => Promise.all([prisma.academicSession.findUnique({ where: { id: data.sessionId } }), prisma.term.findUnique({ where: { id: data.termId } }), prisma.class.findUnique({ where: { id: data.classId } }), prisma.subject.findUnique({ where: { id: data.subjectId } })]);
const create = (data) => prisma.exam.create({ data, include });
const findAll = (where) => prisma.exam.findMany({ where, include, orderBy: { createdAt: "desc" } });
const findById = (id) => prisma.exam.findUnique({ where: { id }, include: { ...include, questions: { include: { options: { select: { id: true, optionKey: true, optionText: true } } }, orderBy: { createdAt: "asc" } } } });
const update = (id, data) => prisma.exam.update({ where: { id }, data, include });
module.exports = { findReferences, create, findAll, findById, update };
