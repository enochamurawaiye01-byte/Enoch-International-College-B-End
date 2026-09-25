const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./report.controller");
const { financialReportQuerySchema } = require("./report.validator");

const router = express.Router();
router.use(authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "BURSAR", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"));

router.get("/financial", validate(financialReportQuerySchema), controller.getFinancialReport);
router.get("/academic", controller.getAcademicReport);
router.get("/attendance", controller.getAttendanceReport);
router.get("/examination", controller.getExaminationReport);
router.get("/operational", controller.getOperationalReport);

module.exports = router;

