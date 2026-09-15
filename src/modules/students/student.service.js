const repository = require("./student.repository");
const NotFoundError = require("../../core/errors/NotFoundError");
const { prisma } = require("../../config/database");
const { hashPassword } = require("../../core/utils/hash");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");
const AppError = require("../../core/errors/AppError");

const getStudentByUserId = async (userId) => {
    const student = await repository.findByUserId(userId);

    if (!student) {
        throw new NotFoundError(
            "Student profile not found"
        );
    }

    return student;
};

const getStudentByRegistrationNumber = async (
    registrationNumber
) => {
    const student =
        await repository.findByRegistrationNumber(
            registrationNumber
        );

    if (!student) {
        throw new NotFoundError(
            "Student not found"
        );
    }

    return student;
};

const createStudent = async (data, schoolId) => {
    if (data.email && await repository.findUserByEmail(data.email.toLowerCase())) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
    if (data.currentClassId) {
        const schoolClass = await repository.findClassById(data.currentClassId);
        if (!schoolClass || !schoolClass.isActive) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND");
    }
    return prisma.$transaction(async (tx) => {
        const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ");
        const passwordHash = await hashPassword(data.password || `${data.firstName}123!`);
        const user = await tx.user.create({ data: { schoolId: schoolId || null, fullName, email: data.email?.toLowerCase() || null, phoneNumber: data.phoneNumber || null, passwordHash, role: "STUDENT", status: "ACTIVE" } });
        const registrationNumber = await generateRegistrationNumber(tx, fullName);
        return tx.student.create({ data: { userId: user.id, registrationNumber, admissionNumber: data.admissionNumber || null, firstName: data.firstName, middleName: data.middleName || null, lastName: data.lastName, currentClassId: data.currentClassId || null, status: data.status || "ACTIVE", admissionDate: new Date() }, include: { currentClass: true } });
    });
};

const getAllStudents = () => repository.findAll();
const getStudentById = async (id) => { const student = await repository.findById(id); if (!student) throw new NotFoundError("Student not found"); return student; };
const updateStudent = async (id, data) => { await getStudentById(id); if (data.currentClassId) { const schoolClass = await repository.findClassById(data.currentClassId); if (!schoolClass || !schoolClass.isActive) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND"); } return repository.updateStudent(id, data); };

module.exports = {
    getStudentByUserId,
    getStudentByRegistrationNumber,
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
};