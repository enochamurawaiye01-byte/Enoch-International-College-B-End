const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const AuthError = require("../../core/errors/AuthError");
const controller = require("./module-access.controller");
const { moduleAccessSchema } = require("./module-access.validator");
const router = express.Router();
router.use(authenticate);
router.get("/", controller.list);
router.put("/", (req, res, next) => {
    if (req.user?.role !== "SUPER_ADMIN") return next(new AuthError("Only a super administrator can change module access.", 403, "SUPER_ADMIN_REQUIRED"));
    return next();
}, validate(moduleAccessSchema), controller.set);
module.exports = router;