const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./payment.controller");
const { createPaymentSchema, verifyPaymentSchema, paystackInitializeSchema } = require("./payment.validator");

const router = express.Router();
const financeRoles = requireRoles("ADMIN", "SUPER_ADMIN", "BURSAR");

router.post("/paystack/webhook", controller.paystackWebhook);
router.post("/paystack/initialize", authenticate, validate(paystackInitializeSchema), controller.initializePaystack);
router.use(authenticate, financeRoles);
router.post("/", validate(createPaymentSchema), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.patch("/:id/verify", validate(verifyPaymentSchema), controller.verify);

module.exports = router;
