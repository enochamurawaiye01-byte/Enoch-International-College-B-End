const AppError = require("../../core/errors/AppError");
const departmentRepository = require("./department.repository");
const { DEPARTMENT_ERRORS } = require("./department.constants");

const createDepartment = async (data) => {
	const name = data.name.trim();
	const existing = await departmentRepository.findDepartmentByName(name);

	if (existing) {
		throw new AppError(
			DEPARTMENT_ERRORS.DEPARTMENT_ALREADY_EXISTS,
			409,
			"DEPARTMENT_ALREADY_EXISTS"
		);
	}

	return departmentRepository.createDepartment({
		name,
		description: data.description || null,
	});
};

const getAllDepartments = () =>
	departmentRepository.findAllDepartments();

const getDepartmentById = async (id) => {
	const department = await departmentRepository.findDepartmentById(id);

	if (!department) {
		throw new AppError(
			DEPARTMENT_ERRORS.DEPARTMENT_NOT_FOUND,
			404,
			"DEPARTMENT_NOT_FOUND"
		);
	}

	return department;
};

const updateDepartment = async (id, data) => {
	const existing = await getDepartmentById(id);
	const updateData = {};

	if (data.name !== undefined) {
		const name = data.name.trim();
		const duplicate = await departmentRepository.findDepartmentByName(name);

		if (duplicate && duplicate.id !== existing.id) {
			throw new AppError(
				DEPARTMENT_ERRORS.DEPARTMENT_ALREADY_EXISTS,
				409,
				"DEPARTMENT_ALREADY_EXISTS"
			);
		}

		updateData.name = name;
	}

	if (data.description !== undefined) {
		updateData.description = data.description || null;
	}

	return departmentRepository.updateDepartment(id, updateData);
};

const deleteDepartment = async (id) => {
	await getDepartmentById(id);
	const usage = await departmentRepository.findDepartmentUsage(id);
	const counts = usage?._count || {};

	if (Object.values(counts).some((count) => count > 0)) {
		throw new AppError(
			DEPARTMENT_ERRORS.DEPARTMENT_ALREADY_IN_USE,
			409,
			"DEPARTMENT_ALREADY_IN_USE"
		);
	}

	return departmentRepository.deleteDepartment(id);
};

module.exports = {
	createDepartment,
	getAllDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
