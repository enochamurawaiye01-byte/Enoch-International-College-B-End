
const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");

const {
    loginSchema,
    registerSchema,
    changePasswordSchema,
} = require("./auth.validator");

const router = express.Router();

router.post(
    "/register",
    validate(registerSchema),
    controller.register
);

router.post(
    "/login",
    validate(loginSchema),
    controller.login
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
