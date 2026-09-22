// Express app setup
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const { corsOptions } = require("./config/cors");
require("dotenv").config();
const routes = require("./routes");
const errorHandler = require("./core/errors/error-handler");

const app = express();

// Security
app.use(helmet());

app.use(cors(corsOptions));

// Body parsers
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString("utf8");
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "uploads")));

// Cookies
app.use(cookieParser());

// Logger
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "School ERP API is running",
    timestamp: new Date().toISOString(),
  });
});
app.get("/api-version", (_req, res) => {
  res.json({ success: true, apiPrefix: "/api", loginEndpoint: "/api/auth/login", loginContract: "email-password" });
});
app.use("/api", routes);

app.use(errorHandler);

module.exports = app;