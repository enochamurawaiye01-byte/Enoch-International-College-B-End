const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const controller = require("./teacher-assignment.controller");
const { createTeacherAssignmentSchema } = require("./teacher-assignment.validator");

const router = express.Router();
router.use(authenticate);
router.post("/", validate(createTeacherAssignmentSchema), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.delete("/:id", controller.remove);
module.exports = router;