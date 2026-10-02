// Subject routes
const express = require("express");

const subjectController = require("./subject.controller");

const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");

const {
    createSubjectSchema,
    updateSubjectSchema,
} = require("./subject.validator");

const router = express.Router();

// All subject routes require authentication
router.use(authenticate);

// Create subject
router.post(
    "/",
    requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"),
    validate(createSubjectSchema),
    subjectController.createSubject
);

// Get all subjects
router.get(
    "/",
    subjectController.getAllSubjects
);

// Get subject by ID
router.get(
    "/:id",
    subjectController.getSubjectById
);

// Update subject
router.patch(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"),
    validate(updateSubjectSchema),
    subjectController.updateSubject
);

// Delete subject
router.delete(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"),
    subjectController.deleteSubject
);

module.exports = router;