require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { startSubscriptionExpiryJob } = require("./jobs/subscriptionExpiry.job");
const { startBookingLifecycleJob } = require("./jobs/bookingLifecycle.job");
const { startSubscriptionReminderJob } = require("./jobs/subscriptionReminder.job");
const { startGuestMembershipLifecycleJob } = require("./jobs/guestMembershipLifecycle.job");
const { startPriceAlertJob } = require("./jobs/priceAlert.job");
const { initializeSocket } = require("./socket");
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  const httpServer = http.createServer(app);
  initializeSocket(httpServer, app);
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startSubscriptionExpiryJob();
    startBookingLifecycleJob();
    startSubscriptionReminderJob();
    startGuestMembershipLifecycleJob();
    startPriceAlertJob();
  });
};
startServer().catch((error) => { console.error("Server startup failed:", error); process.exit(1); });