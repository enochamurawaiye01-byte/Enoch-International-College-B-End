const { prisma } = require("../../config/database");
const findStudent = (id) => prisma.student.findUnique({ where: { id } });
const create = (data) => prisma.disciplineIncident.create({ data, include: { student: true } });
const findAll = (where) => prisma.disciplineIncident.findMany({ where, include: { student: true }, orderBy: { incidentDate: "desc" } });
const findById = (id) => prisma.disciplineIncident.findUnique({ where: { id }, include: { student: true } });
const resolve = (id, data) => prisma.disciplineIncident.update({ where: { id }, data: { ...data, status: "RESOLVED", resolvedAt: new Date() }, include: { student: true } });
module.exports = { findStudent, create, findAll, findById, resolve };
