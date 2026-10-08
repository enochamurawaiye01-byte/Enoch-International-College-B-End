const repository = require("./student.repository");
const NotFoundError = require("../../core/errors/NotFoundError");
const { prisma } = require("../../config/database");
const { hashPassword } = require("../../core/utils/hash");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");
const AppError = require("../../core/errors/AppError");
const { uploadFile, getFileUrl, removeStoredFile } = require("../../config/storage");
const crypto = require("node:crypto");
const { requiresDepartment } = require("../../core/utils/class-academic-rules");

const getStudentByUserId = async (userId) => {
    const student = await repository.findByUserId(userId);

    if (!student) {
        throw new NotFoundError(
            "Student profile not found"
        );
    }

    return enrichCurrentClassTeacher(student);
};

const enrichCurrentClassTeacher = async (student) => {
    if (!student.currentClassId || !student.currentClass) return { ...student, profileImageUrl: await getFileUrl(student.profileImageUrl) };
    const assignment = await repository.findCurrentClassTeacher(student.currentClassId, student.user?.schoolId);
    const classTeacher = assignment
        ? { id: assignment.staff.id, fullName: assignment.staff.user.fullName, session: assignment.session }
        : null;
    return {
        ...student,
        currentClass: { ...student.currentClass, classTeacher },
        profileImageUrl: await getFileUrl(student.profileImageUrl),
    };
};

const getStudentByRegistrationNumber = async (registrationNumber, actor) => {
    const student =
        await repository.findByRegistrationNumber(
            registrationNumber
        );

    if (!student) {
        throw new NotFoundError(
            "Student not found"
        );
    }

    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(actor?.role);
    const isSelf = student.userId === actor?.userId;
    const isAssignedTeacher = actor?.role === "TEACHER" && student.currentClassId
        && await repository.isTeacherAssignedToClass(actor.userId, student.currentClassId);
    if (!isAdmin && !isSelf && !isAssignedTeacher) {
        throw new AppError("You can only access your own student profile.", 403, "STUDENT_ACCESS_DENIED");
    }

    return enrichCurrentClassTeacher(student);
};

const createStudent = async (data, schoolId) => {
    if (!data.currentClassId || !data.email) throw new AppError("A student email and class are required before activation.", 422, "STUDENT_PROFILE_INCOMPLETE");
    if (data.email && await repository.findUserByEmail(data.email.toLowerCase())) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
    return prisma.$transaction(async (tx) => {
        const schoolClass = await tx.class.findFirst({ where: { id: data.currentClassId, isActive: true }, include: { classLevel: true } });
        if (!schoolClass) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND");
        const isSeniorSecondary = requiresDepartment(schoolClass.classLevel.code);
        if (isSeniorSecondary && !data.desiredDepartmentId) throw new AppError("A department is required for senior secondary students.", 422, "STUDENT_DEPARTMENT_REQUIRED");
        if (data.desiredDepartmentId && !(await tx.department.findUnique({ where: { id: data.desiredDepartmentId } }))) {
            throw new AppError("The selected department was not found.", 404, "STUDENT_DEPARTMENT_NOT_FOUND");
        }
        if (!isSeniorSecondary && data.desiredDepartmentId) throw new AppError("Departments can only be selected for senior secondary classes.", 422, "STUDENT_DEPARTMENT_NOT_ALLOWED");

        const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ");
        const passwordHash = await hashPassword(data.password || crypto.randomBytes(24).toString("base64url"));
        const status = data.status || "ACTIVE";
        const session = status === "ACTIVE" ? await tx.academicSession.findFirst({
            where: { isActive: true, ...(schoolId ? { schoolId } : {}) },
            include: { terms: { where: { isActive: true }, orderBy: { startDate: "desc" }, take: 1 } },
            orderBy: { startDate: "desc" },
        }) : null;
        const term = session?.terms[0];
        if (status === "ACTIVE" && (!session || !term)) throw new AppError("An active academic session and term are required before student activation.", 409, "ACTIVE_ACADEMIC_TERM_REQUIRED");

        const user = await tx.user.create({ data: { schoolId: schoolId || null, fullName, email: data.email.toLowerCase(), phoneNumber: data.phoneNumber || null, passwordHash, role: "STUDENT", status: status === "ACTIVE" ? "ACTIVE" : "INACTIVE" } });
        const registrationNumber = status === "ACTIVE" ? await generateRegistrationNumber(tx, fullName, new Date(), schoolId) : null;
        const student = await tx.student.create({ data: {
            userId: user.id,
            registrationNumber,
            admissionNumber: data.admissionNumber || null,
            firstName: data.firstName,
            middleName: data.middleName || null,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth || null,
            gender: data.gender || null,
            address: data.address || null,
            currentClassId: data.currentClassId,
            desiredDepartmentId: data.desiredDepartmentId || null,
            currentSessionId: session?.id || null,
            currentTerm: term?.name || null,
            status,
            admissionDate: new Date()
        }, include: { user: true, currentClass: { include: { classLevel: true } } } });

        if (status === "ACTIVE") {
            const enrollment = await tx.enrollment.create({
                data: { studentId: student.id, sessionId: session.id, termId: term.id, classId: schoolClass.id, departmentId: isSeniorSecondary ? data.desiredDepartmentId : null, status: "ACTIVE" },
            });
            const classSubjects = await tx.classSubject.findMany({ where: { classId: schoolClass.id, subject: { isActive: true } }, include: { subject: true } });
            const applicableSubjects = classSubjects.filter(({ subject }) => !isSeniorSecondary || !subject.departmentId || subject.departmentId === data.desiredDepartmentId);
            if (applicableSubjects.length) await tx.studentSubjectEnrollment.createMany({
                data: applicableSubjects.map(({ id }) => ({ enrollmentId: enrollment.id, classSubjectId: id })),
                skipDuplicates: true,
            });
        }
        return student;
    });
};

const getAllStudents = async (query, user) => {
    const filters = {
        schoolId: user?.schoolId,
        search: query?.search?.trim(),
        classId: query?.classId,
        status: query?.status
    };
    if (user?.role === "TEACHER") {
        const classIds = await repository.findTeacherClassIds(user.userId);
        filters.classIds = query?.classId ? classIds.filter((id) => id === query.classId) : classIds;
        delete filters.classId;
    }
    const students = await repository.findAll(filters);
    return Promise.all(students.map(async (student) => ({ ...student, profileImageUrl: await getFileUrl(student.profileImageUrl) })));
};
const getStudentById = async (id, user) => {
    const student = await repository.findById(id);
    if (!student) throw new NotFoundError("Student not found");
    if (user?.role === "STUDENT" && student.userId !== user.userId) throw new AppError("You can only view your own student profile.", 403, "STUDENT_ACCESS_DENIED");
    if (user?.role === "TEACHER" && (!student.currentClassId || !(await repository.isTeacherAssignedToClass(user.userId, student.currentClassId)))) {
        throw new AppError("You are not assigned to this student's class.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
    }
    return enrichCurrentClassTeacher(student);
};
const updateStudent = async (id, data) => {
    const student = await getStudentById(id);
    if (data.status === "ACTIVE" && student.status !== "ACTIVE") {
        throw new AppError("Activate students through the approval workflow so registration and enrollment are completed.", 409, "STUDENT_APPROVAL_REQUIRED");
    }
    if (data.currentClassId !== undefined && data.currentClassId !== student.currentClassId) {
        throw new AppError("Change student class through enrollment or promotion so academic records remain consistent.", 409, "CLASS_CHANGE_REQUIRES_ENROLLMENT");
    }
    if (data.currentClassId) {
        const schoolClass = await repository.findClassById(data.currentClassId);
        if (!schoolClass || !schoolClass.isActive) throw new AppError("Active class not found.", 404, "CLASS_NOT_FOUND");
    }
    if (data.email && data.email.toLowerCase() !== student.user.email) {
        const duplicate = await repository.findUserByEmail(data.email.toLowerCase());
        if (duplicate) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
    }
    const nextEmail = data.email?.toLowerCase() || student.user.email;
    const nextClass = data.currentClassId || student.currentClassId;
    if (data.status === "ACTIVE" && (!nextEmail || !nextClass)) throw new AppError("A student needs an email and active class before activation.", 422, "STUDENT_PROFILE_INCOMPLETE");
    const { email, phoneNumber, status, ...studentData } = data;
    await prisma.$transaction(async (tx) => {
        if (Object.keys(studentData).length || status) await tx.student.update({ where: { id }, data: { ...studentData, ...(status ? { status } : {}) } });
        const userData = {};
        if (email !== undefined) userData.email = email.toLowerCase();
        if (phoneNumber !== undefined) userData.phoneNumber = phoneNumber;
        if (data.firstName !== undefined || data.middleName !== undefined || data.lastName !== undefined) {
            userData.fullName = [data.firstName ?? student.firstName, data.middleName ?? student.middleName, data.lastName ?? student.lastName].filter(Boolean).join(" ");
        }
        if (status) userData.status = status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
        if (Object.keys(userData).length) await tx.user.update({ where: { id: student.userId }, data: userData });
    });
    return repository.findById(id);
};
const updateProfileImage = async (userId, file) => {
    const student = await repository.findByUserId(userId);
    if (!student) throw new NotFoundError("Student profile not found");
    if (!file) throw new AppError("A profile image is required.", 422, "PROFILE_IMAGE_REQUIRED");
    const stored = await uploadFile({ file, folder: `students/${student.id}`, privateFile: true });
    const updated = await repository.updateProfileImage(student.id, stored.storageReference);
    await removeStoredFile(student.profileImageUrl).catch((error) => console.warn("[Student profile image cleanup]", error.message));
    return { ...updated, profileImageUrl: await getFileUrl(updated.profileImageUrl) };
};

const removeProfileImage = async (userId) => {
    const student = await repository.findByUserId(userId);
    if (!student) throw new NotFoundError("Student profile not found");
    const updated = await repository.updateProfileImage(student.id, null);
    await removeStoredFile(student.profileImageUrl);
    return updated;
};

module.exports = {
    getStudentByUserId,
    getStudentByRegistrationNumber,
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    updateProfileImage,
    removeProfileImage,
    enrichCurrentClassTeacher,
};