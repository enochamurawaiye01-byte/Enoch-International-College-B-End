const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./transcript.controller");
const router = express.Router();
router.use(authenticate);
router.get("/download", requireRoles("ADMIN", "SUPER_ADMIN"), controller.download);
router.get("/student/:studentId", controller.getStudentTranscript);
module.exports = router;