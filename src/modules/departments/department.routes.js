const express = require("express");
const departmentController = require("./department.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");
const {
	createDepartmentSchema,
	updateDepartmentSchema,
} = require("./department.validator");

const router = express.Router();

router.use(authenticate);
const adminOnly = requireRoles("ADMIN", "SUPER_ADMIN");
router.post("/", adminOnly, validate(createDepartmentSchema), departmentController.createDepartment);
router.get("/", departmentController.getAllDepartments);
router.get("/:id", departmentController.getDepartmentById);
router.patch("/:id", adminOnly, validate(updateDepartmentSchema), departmentController.updateDepartment);
router.delete("/:id", adminOnly, departmentController.deleteDepartment);

module.exports = router;
