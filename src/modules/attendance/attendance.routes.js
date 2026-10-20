const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const ValidationError = require("../../core/errors/ValidationError");
const controller = require("./attendance.controller");
const { ATTENDANCE_ROLES } = require("./attendance.constants");
const { attendanceSchema, batchAttendanceSchema, updateAttendanceSchema, attendanceQuerySchema, attendanceRosterQuerySchema } = require("./attendance.validator");

const router = express.Router();
const validateQuery = (req, res, next) => {
	const result = attendanceQuerySchema.safeParse(req.query);
	if (!result.success) {
		return next(new ValidationError("Invalid attendance filters.", result.error.issues));
	}
	req.validatedAttendanceQuery = result.data;
	return next();
};
const validateRosterQuery = (req, res, next) => {
	const result = attendanceRosterQuerySchema.safeParse(req.query);
	if (!result.success) {
		return next(new ValidationError("Invalid attendance roster filters.", result.error.issues));
	}
	req.validatedAttendanceRosterQuery = result.data;
	return next();
};
router.use(authenticate, requireRoles(...ATTENDANCE_ROLES));
router.post("/batch", validate(batchAttendanceSchema), controller.batchCreate);
router.post("/", validate(attendanceSchema), controller.create);
router.get("/roster", validateRosterQuery, controller.getRoster);
router.get("/summary", validateQuery, controller.summary);
router.get("/", validateQuery, controller.getAll);
router.get("/:id", controller.getById);
router.patch("/:id", validate(updateAttendanceSchema), controller.update);
module.exports = router;
