// Server entrypoint
require("dotenv").config();

const app = require("./app");
const { startJobRunner } = require("./modules/jobs");
const { validateEnvironment } = require("./config/env");
const { disconnectDatabase } = require("./config/database");
const { initializeStorage } = require("./config/storage");

validateEnvironment();

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) await initializeStorage();
  const server = app.listen(PORT, () => {
    console.log(`School ERP API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    startJobRunner();
  });
  return server;
};

let server;
startServer().then((startedServer) => { server = startedServer; }).catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exitCode = 1;
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down server...`);

  server.close(async () => {
    await disconnectDatabase();
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));