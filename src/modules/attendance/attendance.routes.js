const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./attendance.controller");
const { ATTENDANCE_ROLES } = require("./attendance.constants");
const { attendanceSchema, updateAttendanceSchema } = require("./attendance.validator");

const router = express.Router();
router.use(authenticate, requireRoles(...ATTENDANCE_ROLES));
router.post("/", validate(attendanceSchema), controller.create);
router.get("/summary", controller.summary);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.patch("/:id", validate(updateAttendanceSchema), controller.update);
module.exports = router;
