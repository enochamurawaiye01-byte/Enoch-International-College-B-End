const { prisma } = require("../../config/database");

const include = {
	desiredClass: { include: { classLevel: true } },
	convertedStudent: { select: { id: true, registrationNumber: true, firstName: true, lastName: true } },
};

const create = (data, client = prisma) => client.admission.create({ data, include });
const findById = (id) => prisma.admission.findUnique({ where: { id }, include });
const findByApplicationNumber = (applicationNumber) => prisma.admission.findUnique({ where: { applicationNumber } });
const findAll = (where) => prisma.admission.findMany({ where, include, orderBy: { createdAt: "desc" } });
const update = (id, data) => prisma.admission.update({ where: { id }, data, include });
const findClass = (id) => prisma.class.findUnique({ where: { id }, include: { classLevel: true } });
const findStudentByEmail = (email) => prisma.user.findUnique({ where: { email } });

module.exports = { create, findById, findByApplicationNumber, findAll, update, findClass, findStudentByEmail };
