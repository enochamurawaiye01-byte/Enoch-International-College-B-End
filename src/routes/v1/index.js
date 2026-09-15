const express = require("express");
const termRoutes = require("../../modules/terms/term.routes");
const authRoutes = require("../../modules/auth/auth.routes");
const studentRoutes = require("../../modules/students/student.routes");
const academicSessionRoutes = require("../../modules/academic-sessions/academic-session.routes");
const classRoutes = require("../../modules/classes/class.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/students", studentRoutes);
router.use("/academic-sessions", academicSessionRoutes);
router.use("/terms", termRoutes);
router.use("/classes", classRoutes);

module.exports = router;