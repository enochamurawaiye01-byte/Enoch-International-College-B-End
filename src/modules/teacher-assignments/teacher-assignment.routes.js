const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const controller = require("./teacher-assignment.controller");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const { createTeacherAssignmentSchema, classTeacherAssignmentSchema } = require("./teacher-assignment.validator");

const router = express.Router();
router.use(authenticate);
router.get("/class-teachers", requireRoles("SUPER_ADMIN", "ADMIN", "TEACHER"), controller.getClassTeachers);
router.post("/class-teachers", requireRoles("SUPER_ADMIN", "ADMIN"), validate(classTeacherAssignmentSchema), controller.assignClassTeacher);
router.delete("/class-teachers/:id", requireRoles("SUPER_ADMIN", "ADMIN"), controller.removeClassTeacher);
router.post("/", requireRoles("SUPER_ADMIN", "ADMIN"), validate(createTeacherAssignmentSchema), controller.create);
router.get("/", requireRoles("SUPER_ADMIN", "ADMIN", "TEACHER"), controller.getAll);
router.get("/:id", requireRoles("SUPER_ADMIN", "ADMIN", "TEACHER"), controller.getById);
router.delete("/:id", requireRoles("SUPER_ADMIN", "ADMIN"), controller.remove);
module.exports = router;