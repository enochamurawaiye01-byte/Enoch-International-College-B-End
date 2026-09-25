
const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");
const { authLimiter } = require("../../core/middleware/rate-limit.middleware");

const {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
} = require("./auth.validator");

const router = express.Router();

router.post(
    "/register",
    authLimiter,
    validate(registerSchema),
    controller.register
);

router.post(
    "/login",
    authLimiter,
    validate(loginSchema),
    controller.login
);

router.post(
    "/refresh",
    authLimiter,
    controller.refreshToken
);

router.post(
    "/forgot-password",
    authLimiter,
    validate(forgotPasswordSchema),
    controller.forgotPassword
);

router.post(
    "/reset-password",
    authLimiter,
    validate(resetPasswordSchema),
    controller.resetPassword
);

router.post(
    "/logout",
    authenticate,
    controller.logout
);

router.get(
    "/me",
    authenticate,
    controller.getCurrentUser
);

router.patch(
    "/change-password",
    authenticate,
    validate(changePasswordSchema),
    controller.changePassword
);

module.exports = router;

