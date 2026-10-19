const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./timetable.repository");
const { isAdmin, overlaps } = require("./timetable.utils");
const storage = require("../../config/storage");
const validateTimetable = async (data) => { const [session, term, schoolClass] = await Promise.all([repository.findSession(data.sessionId), repository.findTerm(data.termId), repository.findClass(data.classId)]); if (!session || !term) throw new NotFoundError("Academic session or term not found"); if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH"); if (!schoolClass?.isActive) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND"); };
const withScheduleFileUrl = async (record) => record?.scheduleFileUrl
    ? { ...record, scheduleFileUrl: await storage.getFileUrl(record.scheduleFileUrl) }
    : record;
const getById = async (id) => { const record = await repository.findById(id); if (!record) throw new NotFoundError("Timetable not found"); return withScheduleFileUrl(record); };
const create = async (data) => { await validateTimetable(data); return repository.create({ ...data, isActive: data.isActive ?? true }); };
const update = async (id, data) => { await getById(id); if (data.sessionId || data.termId || data.classId) await validateTimetable({ ...await getById(id), ...data }); return repository.update(id, data); };
const getAll = async (query, user) => {
    const filters = Object.fromEntries(["sessionId", "termId", "classId"].filter((key) => query[key]).map((key) => [key, query[key]]));
    if (query.isActive !== undefined) filters.isActive = query.isActive === "true";
    if (user?.schoolId) filters.schoolId = user.schoolId;
    if (!filters.sessionId && !filters.termId) {
        const session = await repository.findActiveSessionWithTerm(user?.schoolId);
        const term = session?.terms?.[0];
        if (!session || !term) return [];
        filters.sessionId = session.id;
        filters.termId = term.id;
    }
    const records = await repository.findAll(filters);
    return Promise.all(records.map(withScheduleFileUrl));
};
const uploadClassFile = async (classId, file, user) => {
    if (!["SUPER_ADMIN", "ADMIN"].includes(user?.role)) {
        throw new AppError("Only administrators can upload a class timetable.", 403, "TIMETABLE_UPLOAD_DENIED");
    }
    if (!file) throw new AppError("Choose a timetable image or PDF to upload.", 422, "TIMETABLE_FILE_REQUIRED");
    const schoolClass = await repository.findClass(classId);
    if (!schoolClass?.isActive) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND");
    const session = await repository.findActiveSessionWithTerm(user.schoolId);
    const term = session?.terms?.[0];
    if (!session || !term) {
        throw new AppError("An active academic session and term are required before uploading a timetable.", 409, "ACTIVE_ACADEMIC_TERM_REQUIRED");
    }

    const existing = await repository.findClassTermTimetable(session.id, term.id, classId);
    const media = await storage.uploadFile({ file, folder: `timetables/${session.id}/${classId}` });
    try {
        const record = await repository.upsertClassFile({
            sessionId: session.id,
            termId: term.id,
            classId,
            scheduleFileUrl: media.storageReference,
            scheduleFileName: file.originalname,
        });
        if (existing?.scheduleFileUrl && existing.scheduleFileUrl !== media.storageReference) {
            await storage.removeStoredFile(existing.scheduleFileUrl).catch((cleanupError) => {
                console.warn("[Previous timetable file cleanup failed]", cleanupError.message);
            });
        }
        return withScheduleFileUrl(record);
    } catch (error) {
        await storage.removeStoredFile(media.storageReference).catch((cleanupError) => {
            console.warn("[Timetable upload cleanup failed]", cleanupError.message);
        });
        throw error;
    }
};
const assertSlotAccess = async (user, data) => { if (isAdmin(user.role)) return; if (user.role !== "TEACHER") throw new AppError("Only assigned teachers or administrators can manage timetable slots.", 403, "TIMETABLE_ACCESS_DENIED"); const assignment = await repository.findAssignment(data.staffId, data.subjectId, data.classId, data.sessionId, data.termId); if (!assignment) throw new AppError("You are not assigned to this class and subject.", 403, "TEACHER_ASSIGNMENT_REQUIRED"); };
const saveSlot = async (timetableId, data, user, slotId) => { const timetable = await getById(timetableId); const subject = await repository.findSubject(data.subjectId); if (!subject?.isActive) throw new AppError("Active subject not found.", 404, "SUBJECT_NOT_FOUND"); if (data.staffId && !(await repository.findStaff(data.staffId))) throw new NotFoundError("Staff member not found"); await assertSlotAccess(user, { ...data, classId: timetable.classId, sessionId: timetable.sessionId, termId: timetable.termId }); if (data.startTime >= data.endTime) throw new AppError("Start time must be before end time.", 422, "INVALID_TIME_RANGE"); const conflicts = await repository.findSlotConflicts({ ...data, classId: timetable.classId, sessionId: timetable.sessionId, termId: timetable.termId }, slotId); if (conflicts.some((slot) => overlaps(data.startTime, data.endTime, slot.startTime, slot.endTime))) throw new AppError("Timetable slot conflicts with an existing class or teacher slot.", 409, "TIMETABLE_CONFLICT"); const payload = { ...data, timetableId }; return slotId ? repository.updateSlot(slotId, payload) : repository.createSlot(payload); };
const removeSlot = async (id, user) => { const slot = await repository.findSlot(id); if (!slot) throw new NotFoundError("Timetable slot not found"); if (!isAdmin(user.role)) throw new AppError("Only administrators can delete timetable slots.", 403, "TIMETABLE_DELETE_DENIED"); return repository.removeSlot(id); };
module.exports = { create, update, getById, getAll, uploadClassFile, saveSlot, removeSlot };
