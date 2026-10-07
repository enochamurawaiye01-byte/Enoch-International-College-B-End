// Student routes
const express = require("express");
const controller = require("./student.controller");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const { createStudentSchema, updateStudentSchema } = require("./student.validator");
const { upload, validateImageContent } = require("../../core/middleware/upload.middleware");

const router = express.Router();

router.get(
    "/me",
    authenticate,
    controller.getMyProfile
);

router.post("/me/profile-picture", authenticate, upload.single("file"), validateImageContent, controller.updateProfileImage);
router.delete("/me/profile-picture", authenticate, controller.removeProfileImage);

const adminOnly = requireRoles("ADMIN", "SUPER_ADMIN");
const studentReaders = requireRoles("ADMIN", "SUPER_ADMIN", "TEACHER", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER");
router.post("/", authenticate, adminOnly, validate(createStudentSchema), controller.createStudent);
router.get("/", authenticate, studentReaders, controller.getAllStudents);
router.get("/:id", authenticate, studentReaders, controller.getStudentById);
router.patch("/:id", authenticate, adminOnly, validate(updateStudentSchema), controller.updateStudent);

router.get(
    "/registration/:registrationNumber",
    authenticate,
    controller.getByRegistrationNumber
);

module.exports = router;