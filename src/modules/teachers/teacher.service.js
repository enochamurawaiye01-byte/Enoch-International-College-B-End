const NotFoundError = require("../../core/errors/NotFoundError");
const staffService = require("../staff/staff.service");
const repository = require("./teacher.repository");
const getAll = () => repository.findAll();
const getById = async (id) => { const teacher = await repository.findById(id); if (!teacher) throw new NotFoundError("Teacher not found"); return teacher; };
const getCurrent = async (userId) => { const teacher = await repository.findByUserId(userId); if (!teacher) throw new NotFoundError("Teacher profile not found"); return teacher; };
const create = (data, schoolId) => staffService.create(data, schoolId, "TEACHER");
module.exports = { create, getAll, getById, getCurrent };
