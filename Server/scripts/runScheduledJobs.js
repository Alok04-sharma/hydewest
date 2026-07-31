require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { validateEnv } = require("../config/env");
const {
  runSubscriptionExpiryJob,
} = require("../jobs/subscriptionExpiry.job");
const {
  processBookingLifecycle,
} = require("../jobs/bookingLifecycle.job");
const {
  processSubscriptionReminders,
} = require("../jobs/subscriptionReminder.job");
const {
  processGuestMembershipLifecycle,
} = require("../jobs/guestMembershipLifecycle.job");
const {
  processPriceAlerts,
} = require("../jobs/priceAlert.job");

const JOBS = {
  subscriptions: runSubscriptionExpiryJob,
  bookings: processBookingLifecycle,
  reminders: processSubscriptionReminders,
  memberships: processGuestMembershipLifecycle,
  "price-alerts": processPriceAlerts,
};

const run = async () => {
  validateEnv();
  await connectDB();

  const requested = String(process.argv[2] || "all").trim().toLowerCase();
  const entries =
    requested === "all"
      ? Object.entries(JOBS)
      : [[requested, JOBS[requested]]];

  if (entries.some(([, handler]) => typeof handler !== "function")) {
    throw new Error(
      `Unknown job name. Use one of: all, ${Object.keys(JOBS).join(", ")}`
    );
  }

  for (const [name, handler] of entries) {
    console.log(`[Scheduled Jobs] Starting ${name}...`);
    await handler();
    console.log(`[Scheduled Jobs] Finished ${name}.`);
  }
};

run()
  .then(async () => {
    await mongoose.connection.close(false);
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Scheduled job run failed:", error);
    await mongoose.connection.close(false).catch(() => null);
    process.exit(1);
  });