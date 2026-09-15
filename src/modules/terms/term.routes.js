const express = require("express");

const termController = require("./term.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");

const {
    createTermSchema,
    updateTermSchema,
} = require("./term.validator");

const router = express.Router();

router.use(authenticate);

// Create a term for an academic session
router.post(
    "/sessions/:sessionId",
    validate(createTermSchema),
    termController.createTerm
);

// Get all terms for an academic session
router.get(
    "/sessions/:sessionId",
    termController.getAllTerms
);

// Get one term
router.get(
    "/:id",
    termController.getTermById
);

// Update a term
router.patch(
    "/:id",
    validate(updateTermSchema),
    termController.updateTerm
);

// Activate a term
router.patch(
    "/:id/activate",
    termController.activateTerm
);

router.patch(
    "/:id/close",
    termController.closeTerm
);
// Delete a term
router.delete(
    "/:id",
    termController.deleteTerm
);

module.exports = router;