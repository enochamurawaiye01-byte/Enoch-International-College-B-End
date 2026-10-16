const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./report-card.controller");
const { REPORT_CARD_ROLES } = require("./report-card.constants");
const { TEACHING_ROLES } = require("../../core/utils/teaching-roles");
const { createReportCardSchema, updateReportCardSchema, publicationSchema, classPublicationSchema, assessmentConfigurationSchema, batchResultSchema } = require("./report-card.validator");
const router = express.Router();
const requireReportCardAccess = (req, res, next) => TEACHING_ROLES.has(req.user?.role)
	? next()
	: requireRoles(...REPORT_CARD_ROLES)(req, res, next);
router.use(authenticate, requireReportCardAccess);
router.get("/configuration", controller.getConfiguration);
router.put("/configuration", validate(assessmentConfigurationSchema), controller.updateConfiguration);
router.get("/entry-sheet", controller.getEntrySheet);
router.put("/entries/batch", validate(batchResultSchema), controller.saveEntries);
router.post("/publication/class-term", validate(classPublicationSchema), controller.publishClassTerm);
router.post("/", validate(createReportCardSchema), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.patch("/:id", validate(updateReportCardSchema), controller.update);
router.patch("/:id/publication", validate(publicationSchema), controller.publish);
module.exports = router;
