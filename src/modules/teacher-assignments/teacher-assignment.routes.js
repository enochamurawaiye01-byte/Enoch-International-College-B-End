const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const controller = require("./teacher-assignment.controller");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const { createTeacherAssignmentSchema, classTeacherAssignmentSchema } = require("./teacher-assignment.validator");
const { TEACHING_ROLES } = require("../../core/utils/teaching-roles");

const router = express.Router();
router.use(authenticate);
const requireAssignmentReadAccess = (req, res, next) => TEACHING_ROLES.has(req.user?.role)
	? next()
	: requireRoles("SUPER_ADMIN", "ADMIN")(req, res, next);
router.get("/class-teachers", requireAssignmentReadAccess, controller.getClassTeachers);
router.get("/class-teacher-candidates", requireRoles("SUPER_ADMIN", "ADMIN"), controller.getClassTeacherCandidates);
router.post("/class-teachers", requireRoles("SUPER_ADMIN", "ADMIN"), validate(classTeacherAssignmentSchema), controller.assignClassTeacher);
router.delete("/class-teachers/:id", requireRoles("SUPER_ADMIN", "ADMIN"), controller.removeClassTeacher);
router.post("/", requireRoles("SUPER_ADMIN", "ADMIN"), validate(createTeacherAssignmentSchema), controller.create);
router.get("/", requireAssignmentReadAccess, controller.getAll);
router.get("/:id", requireAssignmentReadAccess, controller.getById);
router.delete("/:id", requireRoles("SUPER_ADMIN", "ADMIN"), controller.remove);
module.exports = router;