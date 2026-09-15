const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./transcript.controller");
const router = express.Router();
router.use(authenticate, requireRoles("ADMIN", "SUPER_ADMIN"));
router.get("/download", controller.download);
module.exports = router;