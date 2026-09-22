
const { prisma } = require("../../config/database");
const AUTH = require("./auth.constants");
const repository = require("./auth.repository");
const { hashPassword, comparePassword } = require("../../core/utils/hash");
const {
    generateAccessToken,
    verifyAccessToken,
} = require("../../core/utils/jwt");
const AuthError = require("../../core/errors/AuthError");
const AppError = require("../../core/errors/AppError");
const studentService = require("../students/student.service");
const generateRegistrationNumber = require("../../core/utils/generate-registration-number");
const jwt = require("jsonwebtoken");
const { sendPasswordResetEmail } = require("../../config/mailer");

const sanitizeUser = (user) => {
    if (!user) return null;

    const { passwordHash, ...safeUser } = user;

    return safeUser;
};

const register = async (data) => {
    const {
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        password,
        role = "STUDENT",
        staffNumber,
        jobTitle,
        qualification,
        childRegistrationNumber,
        relationship,
    } = data;

    const normalizedEmail = email.toLowerCase().trim();
    if (!["STUDENT", "TEACHER", "PARENT"].includes(role)) throw new AuthError("Only student, teacher and parent applications are accepted here", 403, "REGISTRATION_ROLE_NOT_ALLOWED");

    const existingUser = await repository.findUserByEmail(normalizedEmail);

    if (existingUser) {
        throw new AuthError(
            "An account with this email already exists",
            409,
            AUTH.ERROR_CODES.EMAIL_ALREADY_EXISTS
        );
    }

    const passwordHash = await hashPassword(password);

    const child = role === "PARENT"
        ? await prisma.student.findUnique({ where: { registrationNumber: childRegistrationNumber.trim() }, include: { parentLinks: true } })
        : null;
    if (role === "PARENT" && !child) throw new AuthError("No student was found with that registration number", 404, "STUDENT_NOT_FOUND");
    if (role === "PARENT" && child.parentLinks.length) throw new AuthError("This student already has a parent account", 409, "STUDENT_PARENT_EXISTS");

    const fullName = [firstName, middleName, lastName]
        .filter(Boolean)
        .join(" ");

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                fullName,
                email: normalizedEmail,
                phoneNumber: phoneNumber || null,
                passwordHash,
                role,
                status: "INACTIVE",
            },
        });

      const registrationNumber =
    await generateRegistrationNumber(
        tx,
        fullName,
        new Date()
    );

        const student = role === "STUDENT" ? await tx.student.create({
            data: {
                userId: user.id,
                registrationNumber,
                firstName,
                middleName: middleName || null,
                lastName,
                admissionDate: new Date(),
                status: "INACTIVE",
            },
        }) : null;

        const parent = role === "PARENT" ? await tx.parent.create({
            data: { userId: user.id, firstName, lastName, relationship: relationship || null },
        }) : null;

        if (parent) await tx.parentStudent.create({
            data: { parentId: parent.id, studentId: child.id, relationship: relationship || null, isPrimary: true },
        });

        const staff = role === "TEACHER" ? await tx.staff.create({
            data: {
                userId: user.id,
                staffNumber,
                firstName,
                middleName: middleName || null,
                lastName,
                jobTitle: jobTitle || "Teacher",
                qualification: qualification || null,
                status: "INACTIVE",
                employmentType: "FULL_TIME",
            },
        }) : null;

        return {
            user,
            student,
            staff,
            parent,
        };
    });

    return {
        user: sanitizeUser(result.user),
        student: result.student,
        staff: result.staff,
        parent: result.parent,
        pendingApproval: true,
    };
};

const login = async ({ email, password }) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await repository.findUserWithAuthDataByEmail(
        normalizedEmail
    );

    if (!user) {
        throw new AuthError(
            "Invalid email or password",
            401,
            AUTH.ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    if (user.status === "INACTIVE") {
        throw new AuthError(
            "Your account is inactive",
            403,
            AUTH.ERROR_CODES.ACCOUNT_INACTIVE
        );
    }

    if (user.status === "SUSPENDED") {
        throw new AuthError(
            "Your account has been suspended",
            403,
            AUTH.ERROR_CODES.ACCOUNT_SUSPENDED
        );
    }

    if (user.status === "DEACTIVATED") {
        throw new AuthError(
            "Your account has been deactivated",
            403,
            AUTH.ERROR_CODES.ACCOUNT_DEACTIVATED
        );
    }

    const passwordMatches = await comparePassword(
        password,
        user.passwordHash
    );

    if (!passwordMatches) {
        throw new AuthError(
            "Invalid email or password",
            401,
            AUTH.ERROR_CODES.INVALID_CREDENTIALS
        );
    }

   const accessToken = generateAccessToken({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
});

    const sessionDays = Math.min(
        AUTH.SESSION.DEFAULT_DAYS,
        AUTH.SESSION.MAX_DAYS
    );

    const expiresAt = new Date(
        Date.now() + sessionDays * 24 * 60 * 60 * 1000
    );

    await repository.createSession({
        userId: user.id,
        token: accessToken,
        expiresAt,
    });

    await repository.updateLastLogin(user.id);

    return {
        user: sanitizeUser(user),
        accessToken,
        tokenType: AUTH.TOKEN.TYPE,
        expiresAt,
    };
};

const forgotPassword = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await repository.findUserByEmail(normalizedEmail);

    if (!user) return;

    const token = jwt.sign(
        { userId: user.id, email: normalizedEmail, purpose: "password-reset" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );
    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
    const resetUrl = `${process.env.FRONTEND_RESET_URL || `${frontendBase}/reset-password.html`}?token=${encodeURIComponent(token)}`;

    try {
        await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });
    } catch (error) {
        throw new AppError(
            "Password reset email service is not configured or unavailable",
            503,
            "EMAIL_SERVICE_UNAVAILABLE"
        );
    }
};

const resetPassword = async ({ token, password }) => {
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new AuthError("This reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");
    }

    if (payload.purpose !== "password-reset") {
        throw new AuthError("This reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");
    }

    const user = await repository.findUserById(payload.userId);
    if (!user || user.email !== payload.email) {
        throw new AuthError("This reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
    });
    await repository.deleteAllUserSessions(user.id);

    return { success: true, message: "Password reset successfully. You can now sign in." };
};

const logout = async (token) => {
    try {
        await repository.deleteSessionByToken(token);

        return {
            success: true,
            message: "Logged out successfully",
        };
    } catch (error) {
        throw new AppError(
            "Unable to log out",
            500,
            AUTH.ERROR_CODES.LOGOUT_FAILED
        );
    }
};

const getCurrentUser = async (userId) => {
    const user = await repository.findUserById(userId);

    if (!user) {
        throw new AuthError(
            "User account not found",
            404,
            AUTH.ERROR_CODES.USER_NOT_FOUND
        );
    }

    return sanitizeUser(user);
};

const changePassword = async (userId, data) => {
    const { currentPassword, newPassword } = data;

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) {
        throw new AuthError(
            "User account not found",
            404,
            AUTH.ERROR_CODES.USER_NOT_FOUND
        );
    }

    const matches = await comparePassword(
        currentPassword,
        user.passwordHash
    );

    if (!matches) {
        throw new AuthError(
            "Current password is incorrect",
            401,
            AUTH.ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            passwordHash: newPasswordHash,
        },
    });

    await repository.deleteAllUserSessions(userId);

    return {
        success: true,
        message: "Password changed successfully. Please log in again.",
    };
};

const verifyToken = (token) => {
    try {
        return verifyAccessToken(token);
    } catch (error) {
        throw new AuthError(
            "Invalid or expired token",
            401,
            AUTH.ERROR_CODES.INVALID_TOKEN
        );
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    logout,
    getCurrentUser,
    changePassword,
    verifyToken,
};

