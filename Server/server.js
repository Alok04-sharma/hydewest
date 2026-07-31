require("dotenv").config();

const { validateEnv } = require("./config/env");

validateEnv();

const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const { startSubscriptionExpiryJob } = require("./jobs/subscriptionExpiry.job");
const { startBookingLifecycleJob } = require("./jobs/bookingLifecycle.job");
const { startSubscriptionReminderJob } = require("./jobs/subscriptionReminder.job");
const { startGuestMembershipLifecycleJob } = require("./jobs/guestMembershipLifecycle.job");
const { startPriceAlertJob } = require("./jobs/priceAlert.job");
const { initializeSocket } = require("./socket");

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
let httpServer = null;

const startBackgroundJobs = () => {
  const defaultValue = process.env.NODE_ENV === "production" ? "false" : "true";

  if (
    String(process.env.RUN_BACKGROUND_JOBS || defaultValue).toLowerCase() !==
    "true"
  ) {
    console.log("Background jobs are disabled by RUN_BACKGROUND_JOBS.");
    return;
  }

  startSubscriptionExpiryJob();
  startBookingLifecycleJob();
  startSubscriptionReminderJob();
  startGuestMembershipLifecycleJob();
  startPriceAlertJob();
};

const startServer = async () => {
  await connectDB();

  httpServer = http.createServer(app);

  // Bound slow or abandoned connections so they cannot consume a worker forever.
  httpServer.requestTimeout = 120000;
  httpServer.headersTimeout = 65000;
  httpServer.keepAliveTimeout = 5000;
  httpServer.maxRequestsPerSocket = 1000;

  initializeSocket(httpServer, app);

  httpServer.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    startBackgroundJobs();
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);

  forceExitTimer.unref?.();

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await mongoose.connection.close(false);
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});