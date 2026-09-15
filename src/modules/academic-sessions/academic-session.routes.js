// AcademicSession routes
const express = require("express");

const controller = require("./academic-session.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");

const {
    createAcademicSessionSchema,
    updateAcademicSessionSchema,
} = require("./academic-session.validator");

const router = express.Router();

router.use(authenticate);

router.post(
    "/",
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
    validate(updateAcademicSessionSchema),
    controller.updateSession
);

router.patch(
    "/:id/activate",
    controller.activateSession
);

router.delete(
    "/:id",
    controller.deleteSession
);

module.exports = router;