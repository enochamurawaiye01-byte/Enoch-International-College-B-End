const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./result.controller");
const { publishResultSchema } = require("./result.validator");
const { batchResultSchema } = require("../report-cards/report-card.validator");
const { TEACHING_ROLES } = require("../../core/utils/teaching-roles");
const AuthError = require("../../core/errors/AuthError");
const router = express.Router();
router.use(authenticate);
router.get("/term-entry", controller.getTermEntrySheet);
router.put("/term-entry/batch", validate(batchResultSchema), controller.saveTermEntries);
router.get("/term-reports", controller.getTermReports);
router.get("/mine", controller.getMine);
router.get("/teacher", (req, _res, next) => TEACHING_ROLES.has(req.user?.role)
	? next()
	: next(new AuthError("A teaching account is required.", 403, "TEACHER_RESULT_ACCESS_DENIED")), controller.getTeacher);
router.get("/", requireRoles("ADMIN", "SUPER_ADMIN"), controller.getAll);
router.get("/:id", requireRoles("ADMIN", "SUPER_ADMIN"), controller.getById);
router.patch("/:id/publish", requireRoles("ADMIN", "SUPER_ADMIN"), validate(publishResultSchema), controller.publish);
module.exports = router;
