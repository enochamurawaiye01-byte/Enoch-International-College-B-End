const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./teacher.controller");
const { TEACHER_ROLES } = require("./teacher.constants");
const { createTeacherSchema } = require("./teacher.validator");
const { upload, validateImageContent } = require("../../core/middleware/upload.middleware");
const AuthError = require("../../core/errors/AuthError");
const router = express.Router();
router.use(authenticate);
const requireTeacherSelf = (req, _res, next) => req.user?.role === "TEACHER"
	? next()
	: next(new AuthError("Teacher account required.", 403, "TEACHER_PROFILE_ACCESS_DENIED"));
router.post("/", requireRoles(...TEACHER_ROLES), validate(createTeacherSchema), controller.create);
router.get("/me", requireTeacherSelf, controller.getCurrent);
router.get("/me/assignments", requireTeacherSelf, controller.getAssignments);
router.post("/me/profile-picture", requireTeacherSelf, upload.single("file"), validateImageContent, controller.updateProfileImage);
router.delete("/me/profile-picture", requireTeacherSelf, controller.removeProfileImage);
router.get("/", requireRoles(...TEACHER_ROLES, "TEACHER"), controller.getAll);
router.get("/:id", requireRoles(...TEACHER_ROLES, "TEACHER"), controller.getById);
router.patch("/:id/status", requireRoles(...TEACHER_ROLES), controller.changeStatus);
router.patch("/:id", requireRoles(...TEACHER_ROLES), controller.update);
module.exports = router;
