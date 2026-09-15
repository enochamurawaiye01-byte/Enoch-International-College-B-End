const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./management.controller");
const { MANAGEMENT_ROLES } = require("./management.constants");
const router = express.Router();
router.use(authenticate, requireRoles(...MANAGEMENT_ROLES));
router.get("/dashboard", controller.dashboard);
module.exports = router;
