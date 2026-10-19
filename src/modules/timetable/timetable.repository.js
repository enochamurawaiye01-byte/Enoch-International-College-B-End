const { prisma } = require("../../config/database");
const include = { session: true, term: true, class: { include: { classLevel: true } }, slots: { include: { subject: true, staff: true }, orderBy: { startTime: "asc" } } };
const findById = (id) => prisma.timetable.findUnique({ where: { id }, include });
const findAll = ({ schoolId, ...where }) => prisma.timetable.findMany({
  where: { ...where, ...(schoolId ? { session: { schoolId } } : {}) },
  include,
  orderBy: [{ session: { startDate: "desc" } }, { class: { name: "asc" } }],
});
const findSession = (id) => prisma.academicSession.findUnique({ where: { id } });
const findActiveSessionWithTerm = (schoolId) => prisma.academicSession.findFirst({
  where: { isActive: true, ...(schoolId ? { schoolId } : {}) },
  include: { terms: { where: { isActive: true }, orderBy: { startDate: "desc" }, take: 1 } },
  orderBy: { startDate: "desc" },
});
const findTerm = (id) => prisma.term.findUnique({ where: { id } });
const findClass = (id) => prisma.class.findUnique({ where: { id } });
const findClassTermTimetable = (sessionId, termId, classId) => prisma.timetable.findUnique({
  where: { sessionId_termId_classId: { sessionId, termId, classId } },
  select: { scheduleFileUrl: true },
});
const findSubject = (id) => prisma.subject.findUnique({ where: { id } });
const findStaff = (id) => prisma.staff.findUnique({ where: { id } });
const findAssignment = (staffId, subjectId, classId, sessionId, termId) => prisma.teacherAssignment.findFirst({ where: { staffId, subjectId, classId, AND: [{ OR: [{ sessionId: null }, { sessionId }] }, { OR: [{ termId: null }, { termId }] }] } });
const findSlotConflicts = (data, excludeId) => prisma.timetableSlot.findMany({ where: { id: excludeId ? { not: excludeId } : undefined, day: data.day, isActive: true, timetable: { sessionId: data.sessionId, termId: data.termId }, OR: [{ timetable: { classId: data.classId } }, ...(data.staffId ? [{ staffId: data.staffId }] : [])] } });
const create = (data) => prisma.timetable.create({ data, include });
const update = (id, data) => prisma.timetable.update({ where: { id }, data, include });
const upsertClassFile = ({ sessionId, termId, classId, scheduleFileUrl, scheduleFileName }) =>
  prisma.timetable.upsert({
    where: { sessionId_termId_classId: { sessionId, termId, classId } },
    create: { sessionId, termId, classId, scheduleFileUrl, scheduleFileName, isActive: true },
    update: { scheduleFileUrl, scheduleFileName, isActive: true },
    include,
  });
const createSlot = (data) => prisma.timetableSlot.create({ data, include: { subject: true, staff: true } });
const updateSlot = (id, data) => prisma.timetableSlot.update({ where: { id }, data, include: { subject: true, staff: true } });
const findSlot = (id) => prisma.timetableSlot.findUnique({ where: { id }, include: { timetable: true } });
const removeSlot = (id) => prisma.timetableSlot.delete({ where: { id } });
module.exports = { findById, findAll, findSession, findActiveSessionWithTerm, findTerm, findClass, findClassTermTimetable, findSubject, findStaff, findAssignment, findSlotConflicts, create, update, upsertClassFile, createSlot, updateSlot, findSlot, removeSlot };
