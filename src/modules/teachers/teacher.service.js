const NotFoundError = require("../../core/errors/NotFoundError");
const AppError = require("../../core/errors/AppError");
const staffService = require("../staff/staff.service");
const repository = require("./teacher.repository");
const assignmentService = require("../teacher-assignments/teacher-assignment.service");
const { uploadFile, getFileUrl, removeStoredFile } = require("../../config/storage");
const { prisma } = require("../../config/database");
const attachAssignmentPeriods = async (assignments = []) => {
 const sessionIds = [...new Set(assignments.map((item) => item.sessionId).filter(Boolean))];
 const termIds = [...new Set(assignments.map((item) => item.termId).filter(Boolean))];
 const [sessions, terms] = await Promise.all([
  sessionIds.length ? prisma.academicSession.findMany({ where: { id: { in: sessionIds } }, select: { id: true, name: true, isActive: true } }) : [],
  termIds.length ? prisma.term.findMany({ where: { id: { in: termIds } }, select: { id: true, name: true, type: true } }) : [],
 ]);
 const sessionById = new Map(sessions.map((item) => [item.id, item]));
 const termById = new Map(terms.map((item) => [item.id, item]));
 return assignments.map((item) => ({ ...item, session: sessionById.get(item.sessionId) || null, term: termById.get(item.termId) || null }));
};
const withSignedProfile = async (teacher) => teacher ? {
 ...teacher,
 profileImageUrl: await getFileUrl(teacher.profileImageUrl),
 teacherAssignments: await attachAssignmentPeriods(teacher.teacherAssignments),
} : teacher;
const getAll = async () => Promise.all((await repository.findAll()).map(withSignedProfile));
const getById = async (id) => { const teacher = await repository.findById(id); if (!teacher) throw new NotFoundError("Teacher not found"); return withSignedProfile(teacher); };
const getCurrent = async (userId) => { const teacher = await repository.findByUserId(userId); if (!teacher) throw new NotFoundError("Teacher profile not found"); return withSignedProfile(teacher); };
const create = (data, schoolId) => staffService.create(data, schoolId, "TEACHER");
const update = (id, data) => staffService.update(id, data);
const changeStatus = async (id, status) => {
 if (!["ACTIVE", "INACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) throw new Error("Invalid teacher status.");
 const teacher = await getById(id);
 await repository.update(id, { status: status === "ACTIVE" ? "ACTIVE" : "INACTIVE" });
 await require("../../config/database").prisma.user.update({ where: { id: teacher.user.id }, data: { status } });
 return getById(id);
};
const getAssignments = async (userId, query) => {
 const teacher = await repository.findByUserId(userId);
 if (!teacher) throw new NotFoundError("Teacher profile not found");
 const assignments = await assignmentService.getAll({ ...query, staffId: teacher.id });
 const enriched = await attachAssignmentPeriods(assignments);
 return Promise.all(enriched.map(async (assignment) => ({ ...assignment, staff: await withSignedProfile(assignment.staff) })));
};
const updateProfileImage = async (userId, file) => {
 const teacher = await repository.findByUserId(userId);
 if (!teacher) throw new NotFoundError("Teacher profile not found");
 if (!file) throw new AppError("A profile image is required.", 422, "PROFILE_IMAGE_REQUIRED");
 const stored = await uploadFile({ file, folder: `teachers/${teacher.id}`, privateFile: true });
 const updated = await repository.updateProfileImage(teacher.id, stored.storageReference);
 await removeStoredFile(teacher.profileImageUrl).catch((error) => console.warn("[Teacher profile image cleanup]", error.message));
 return withSignedProfile(updated);
};
const removeProfileImage = async (userId) => {
 const teacher = await repository.findByUserId(userId);
 if (!teacher) throw new NotFoundError("Teacher profile not found");
 const updated = await repository.updateProfileImage(teacher.id, null);
 await removeStoredFile(teacher.profileImageUrl);
 return updated;
};
module.exports = { create, getAll, getById, getCurrent, update, changeStatus, getAssignments, updateProfileImage, removeProfileImage };
