const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const validate = require("../../core/middleware/validation.middleware");
const controller = require("./class-subject.controller");
const { createClassSubjectSchema } = require("./class-subject.validator");

const router = express.Router();
router.use(authenticate);
router.post("/", requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"), validate(createClassSubjectSchema), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.delete("/:id", requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"), controller.remove);

module.exports = router;