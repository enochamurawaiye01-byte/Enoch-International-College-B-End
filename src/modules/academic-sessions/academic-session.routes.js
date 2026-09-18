// AcademicSession routes
const express = require("express");

const controller = require("./academic-session.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");

const {
    createAcademicSessionSchema,
    updateAcademicSessionSchema,
} = require("./academic-session.validator");

const router = express.Router();

router.use(authenticate);

router.post(
    "/",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    validate(createAcademicSessionSchema),
    controller.createSession
);

router.get(
    "/",
    controller.getAllSessions
);

router.get(
    "/:id",
    controller.getSessionById
);

router.patch(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    validate(updateAcademicSessionSchema),
    controller.updateSession
);

router.patch(
    "/:id/activate",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    controller.activateSession
);

router.delete(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    controller.deleteSession
);

module.exports = router;