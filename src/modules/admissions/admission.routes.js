const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./admission.controller");
const { ADMISSION_ROLES } = require("./admission.constants");
const { createAdmissionSchema, updateAdmissionSchema } = require("./admission.validator");

const router = express.Router();
router.use(authenticate, requireRoles(...ADMISSION_ROLES));
router.post("/", validate(createAdmissionSchema), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.patch("/:id", validate(updateAdmissionSchema), controller.update);
router.post("/:id/convert", controller.convertToStudent);

module.exports = router;
