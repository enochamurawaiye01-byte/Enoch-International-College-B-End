// Student routes
const express = require("express");
const controller = require("./student.controller");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const { createStudentSchema, updateStudentSchema } = require("./student.validator");

const router = express.Router();

router.get(
    "/me",
    authenticate,
    controller.getMyProfile
);

const adminOnly = requireRoles("ADMIN", "SUPER_ADMIN");
router.post("/", authenticate, adminOnly, validate(createStudentSchema), controller.createStudent);
router.get("/", authenticate, adminOnly, controller.getAllStudents);
router.get("/:id", authenticate, adminOnly, controller.getStudentById);
router.patch("/:id", authenticate, adminOnly, validate(updateStudentSchema), controller.updateStudent);

router.get(
    "/registration/:registrationNumber",
    authenticate,
    controller.getByRegistrationNumber
);

module.exports = router;