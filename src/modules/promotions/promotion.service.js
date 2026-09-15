const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./promotion.repository");
const { PROMOTION_ERRORS: ERRORS } = require("./promotion.constants");
const nextLevel = { JSS1: "JSS2", JSS2: "JSS3", JSS3: "SS1", SS1: "SS2", SS2: "SS3" };
const create = async (data) => {
    const [student, fromClass, toClass, session] = await Promise.all([repository.findStudent(data.studentId), repository.findClass(data.fromClassId), data.toClassId ? repository.findClass(data.toClassId) : null, repository.findSession(data.sessionId)]);
    if (!student) throw new NotFoundError(ERRORS.STUDENT_NOT_FOUND);
    if (!fromClass) throw new NotFoundError(ERRORS.FROM_CLASS_NOT_FOUND);
    if (data.toClassId && !toClass) throw new NotFoundError(ERRORS.TO_CLASS_NOT_FOUND);
    if (!session) throw new NotFoundError(ERRORS.SESSION_NOT_FOUND);
    if (student.currentClassId !== data.fromClassId) throw new AppError(ERRORS.CURRENT_CLASS_MISMATCH, 409, "CURRENT_CLASS_MISMATCH");
    if (["PROMOTED", "CONDITIONAL"].includes(data.status) && (!toClass || nextLevel[fromClass.classLevel.name] !== toClass.classLevel.name)) throw new AppError(ERRORS.INVALID_PROGRESSION, 409, "INVALID_PROGRESSION");
    if (data.status === "GRADUATED" && data.toClassId) throw new AppError("Graduation cannot have a target class.", 409, "INVALID_GRADUATION");
    if (data.status !== "GRADUATED" && data.status !== "NOT_PROMOTED" && !data.toClassId) throw new AppError("A target class is required.", 400, "TARGET_CLASS_REQUIRED");
    if (await repository.findExisting(data.studentId, data.sessionId)) throw new AppError(ERRORS.PROMOTION_EXISTS, 409, "PROMOTION_EXISTS");
    return prisma.$transaction(async (tx) => {
        const promotion = await tx.promotion.create({ data: { ...data, average: data.average ?? null, remarks: data.remarks || null }, include: { student: true, fromClass: { include: { classLevel: true } }, toClass: { include: { classLevel: true } }, session: true } });
        if (data.status === "GRADUATED") await tx.student.update({ where: { id: data.studentId }, data: { status: "GRADUATED", currentClassId: null, currentSessionId: data.sessionId } });
        else if (["PROMOTED", "CONDITIONAL"].includes(data.status)) await tx.student.update({ where: { id: data.studentId }, data: { status: "ACTIVE", currentClassId: data.toClassId, currentSessionId: data.sessionId } });
        return promotion;
    });
};
const getAll = (query) => { const filters = {}; ["studentId", "sessionId", "status"].forEach((key) => { if (query[key]) filters[key] = query[key]; }); return repository.findAll(filters); };
const getById = async (id) => { const record = await repository.findById(id); if (!record) throw new NotFoundError(ERRORS.PROMOTION_NOT_FOUND); return record; };
module.exports = { create, getAll, getById };