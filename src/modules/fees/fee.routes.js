const express = require("express");
const authenticate = require("../../core/middleware/auth.middleware");
const validate = require("../../core/middleware/validation.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const controller = require("./fee.controller");
const { createFeeAccountSchema } = require("./fee.validator");

const router = express.Router();
const financeRoles = requireRoles("ADMIN", "SUPER_ADMIN", "BURSAR");

router.use(authenticate);

// Fee Structure CRUD (matches frontend /fees endpoints)
router.get("/", controller.getAllFeeStructures);
router.post("/", financeRoles, controller.createFeeStructure);
router.get("/:id", controller.getFeeStructureById);
router.put("/:id", financeRoles, controller.updateFeeStructure);
router.patch("/:id", financeRoles, controller.updateFeeStructure);
router.delete("/:id", financeRoles, controller.deleteFeeStructure);

// Fee Accounts & Balances
router.post("/accounts", financeRoles, validate(createFeeAccountSchema), controller.createAccount);
router.get("/accounts", financeRoles, controller.getAccounts);
router.get("/accounts/:id", financeRoles, controller.getAccount);
router.get("/balance/:studentId", financeRoles, controller.getStudentBalance);

module.exports = router;

