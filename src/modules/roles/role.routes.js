const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./role.controller");
const { ROLE_ROLES } = require("./role.constants");
const { createRoleSchema, updateRoleSchema, userRoleSchema } = require("./role.validator");
const router = express.Router();

router.use(authenticate);

// Public activation endpoint for authenticated users activating their own pending role
router.post("/activate", controller.activateRole);

// Admin-only endpoints for role management & diagnostics
router.use(requireRoles(...ROLE_ROLES));
router.post("/", validate(createRoleSchema), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.patch("/:id", validate(updateRoleSchema), controller.update);
router.delete("/:id", controller.remove);
router.post("/assign", controller.assign);
router.post("/test-email", controller.testEmail);
router.patch("/users/:userId", controller.changeUserRole);
router.put("/users/:userId", controller.changeUserRole);

module.exports = router;
