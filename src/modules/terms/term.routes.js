const express = require("express");

const termController = require("./term.controller");
const validate = require("../../core/middleware/validation.middleware");
const authenticate = require("../../core/middleware/auth.middleware");
const { requireRoles } = require("../../core/middleware/authorization.middleware");

const {
    createTermSchema,
    updateTermSchema,
} = require("./term.validator");

const router = express.Router();

router.use(authenticate);

// Create a term for an academic session
router.post(
    "/sessions/:sessionId",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    validate(createTermSchema),
    termController.createTerm
);

// Get all terms for an academic session
router.get(
    "/sessions/:sessionId",
    termController.getAllTerms
);

// Get current active term
router.get(
    "/current",
    termController.getCurrentTerm
);

// Get one term
router.get(
    "/:id",
    termController.getTermById
);


// Update a term
router.patch(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    validate(updateTermSchema),
    termController.updateTerm
);

// Activate a term
router.patch(
    "/:id/activate",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    termController.activateTerm
);

router.patch(
    "/:id/close",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    termController.closeTerm
);
// Delete a term
router.delete(
    "/:id",
    requireRoles("SUPER_ADMIN", "ADMIN"),
    termController.deleteTerm
);

module.exports = router;