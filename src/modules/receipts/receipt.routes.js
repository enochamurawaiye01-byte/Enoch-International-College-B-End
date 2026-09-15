const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./receipt.controller");
const { receiptStatusSchema } = require("./receipt.validator");

const router = express.Router();
const financeRoles = requireRoles("ADMIN", "SUPER_ADMIN", "BURSAR");

router.use(authenticate, financeRoles);
router.get("/", controller.getAll);
router.get("/payment/:paymentId", controller.getByPaymentId);
router.get("/:id", controller.getById);
router.patch("/:id/status", validate(receiptStatusSchema), controller.setStatus);

module.exports = router;
