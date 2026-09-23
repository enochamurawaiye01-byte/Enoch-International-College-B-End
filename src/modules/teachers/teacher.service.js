const NotFoundError = require("../../core/errors/NotFoundError");
const staffService = require("../staff/staff.service");
const repository = require("./teacher.repository");
const assignmentService = require("../teacher-assignments/teacher-assignment.service");
const getAll = () => repository.findAll();
const getById = async (id) => { const teacher = await repository.findById(id); if (!teacher) throw new NotFoundError("Teacher not found"); return teacher; };
const getCurrent = async (userId) => { const teacher = await repository.findByUserId(userId); if (!teacher) throw new NotFoundError("Teacher profile not found"); return teacher; };
const create = (data, schoolId) => staffService.create(data, schoolId, "TEACHER");
const update = (id, data) => staffService.update(id, data);
const changeStatus = async (id, status) => {
 if (!["ACTIVE", "INACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) throw new Error("Invalid teacher status.");
 const teacher = await getById(id);
 await repository.update(id, { status: status === "ACTIVE" ? "ACTIVE" : "INACTIVE" });
 await require("../../config/database").prisma.user.update({ where: { id: teacher.user.id }, data: { status } });
 return getById(id);
};
const getAssignments = async (userId, query) => { const teacher = await repository.findByUserId(userId); if (!teacher) throw new NotFoundError("Teacher profile not found"); return assignmentService.getAll({ ...query, staffId: teacher.id }); };
module.exports = { create, getAll, getById, getCurrent, update, changeStatus, getAssignments };
