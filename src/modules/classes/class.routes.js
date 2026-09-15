const express = require("express");

const classController = require("./class.controller");

const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");

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

// Update class
router.patch(
    "/:id",
    validate(updateClassSchema),
    classController.updateClass
);

// Delete class
router.delete(
    "/:id",
    classController.deleteClass
);

module.exports = router;