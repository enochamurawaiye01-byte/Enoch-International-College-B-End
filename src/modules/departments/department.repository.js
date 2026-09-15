const prisma = require("../../config/prisma");

const createDepartment = (data) =>
	prisma.department.create({ data });

const findAllDepartments = () =>
	prisma.department.findMany({
		orderBy: { name: "asc" },
		include: { _count: { select: { subjects: true, staff: true } } },
	});

const findDepartmentById = (id) =>
	prisma.department.findUnique({ where: { id } });

const findDepartmentByName = (name) =>
	prisma.department.findFirst({
		where: { name: { equals: name, mode: "insensitive" } },
	});

const updateDepartment = (id, data) =>
	prisma.department.update({ where: { id }, data });

const findDepartmentUsage = (id) =>
	prisma.department.findUnique({
		where: { id },
		select: { _count: { select: { subjects: true, staff: true } } },
	});

const deleteDepartment = (id) =>
	prisma.department.delete({ where: { id } });

module.exports = {
	createDepartment,
	findAllDepartments,
	findDepartmentById,
	findDepartmentByName,
	updateDepartment,
	findDepartmentUsage,
	deleteDepartment,
};
