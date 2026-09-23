const express = require("express");

const classController = require("./class.controller");

const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");

const {
    createClassSchema,
    updateClassSchema,
} = require("./class.validator");

const router = express.Router();

// All class routes require authentication
router.use(authenticate);

// Create class
router.post(
    "/",
    requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"),
    validate(createClassSchema),
    classController.createClass
);

// Get all classes
router.get(
    "/",
    classController.getAllClasses
);

// Get class by ID
router.get(
    "/:id",
    classController.getClassById
);

router.get(
    "/:id/students",
    classController.getStudents
);

// Update class
router.patch(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"),
    validate(updateClassSchema),
    classController.updateClass
);

// Delete class
router.delete(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    classController.deleteClass
);

module.exports = router;