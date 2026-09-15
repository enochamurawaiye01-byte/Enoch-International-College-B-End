// Auth controller
const authService = require("./auth.service");

const register = async (req, res, next) => {
    try {
        const result = await authService.register(req.body);

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: result,
        });
    } catch (error) {
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

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    changePassword,
};

