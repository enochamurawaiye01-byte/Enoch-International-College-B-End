// Auth controller
const authService = require("./auth.service");
const { uploadFile, removeStoredFile } = require("../../config/storage");

const getRegistrationOptions = async (req, res, next) => {
    try {
        const data = await authService.getPublicRegistrationOptions();
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const register = async (req, res, next) => {
    let storedLetter;
    try {
        if (req.file) {
            storedLetter = await uploadFile({
                file: req.file,
                folder: "teacher-applications",
                privateFile: true,
            });
        }
        const result = await authService.register(req.body, storedLetter?.storageReference || null);

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: result,
        });
    } catch (error) {
        if (storedLetter) {
            try {
                await removeStoredFile(storedLetter.storageReference);
            } catch (cleanupError) {
                console.error(`[Application letter cleanup failed] message=${cleanupError.message}`);
            }
        }
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        await authService.forgotPassword(req.body.email);
        res.status(200).json({
            success: true,
            message: "If an account matches that email, a password reset link has been sent.",
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const result = await authService.resetPassword(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const result = await authService.logout(req.token);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getCurrentUser = async (req, res, next) => {
    try {
        const user = await authService.getCurrentUser(req.user.userId);

        res.status(200).json({
            success: true,
            data: {
                user,
            },
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const result = await authService.changePassword(
            req.user.userId,
            req.body
        );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const token = req.body.refreshToken || req.headers["x-refresh-token"];
        const result = await authService.refreshToken(token);

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRegistrationOptions,
    register,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
    logout,
    getCurrentUser,
    changePassword,
};

