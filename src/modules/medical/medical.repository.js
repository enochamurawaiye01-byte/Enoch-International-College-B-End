const { prisma } = require("../../config/database");
const findStudent = (id) => prisma.student.findUnique({ where: { id } });
const upsertProfile = (data) => prisma.medicalProfile.upsert({ where: { studentId: data.studentId }, update: data, create: data });
const findProfile = (studentId) => prisma.medicalProfile.findUnique({ where: { studentId }, include: { student: { include: { medicalVisits: true } } } });
const createVisit = (data) => prisma.medicalVisit.create({ data, include: { student: true } });
const findVisits = (studentId) => prisma.medicalVisit.findMany({ where: studentId ? { studentId } : undefined, include: { student: true }, orderBy: { incidentDate: "desc" } });
module.exports = { findStudent, upsertProfile, findProfile, createVisit, findVisits };
