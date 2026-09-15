
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
    } = data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await repository.findUserByEmail(normalizedEmail);

    if (existingUser) {
        throw new AuthError(
            "An account with this email already exists",
            409,
            AUTH.ERROR_CODES.EMAIL_ALREADY_EXISTS
        );
    }

    const passwordHash = await hashPassword(password);

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
                role: "STUDENT",
                status: "ACTIVE",
            },
        });

      const registrationNumber =
    await generateRegistrationNumber(
        tx,
        fullName,
        new Date()
    );

        const student = await tx.student.create({
            data: {
                userId: user.id,
                registrationNumber,
                firstName,
                middleName: middleName || null,
                lastName,
                admissionDate: new Date(),
                status: "ACTIVE",
            },
        });

        return {
            user,
            student,
        };
    });

    return {
        user: sanitizeUser(result.user),
        student: result.student,
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
    logout,
    getCurrentUser,
    changePassword,
    verifyToken,
};

