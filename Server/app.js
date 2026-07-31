const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth.routes");
const apartmentRoutes = require("./routes/apartment.routes");
const ownerRoutes = require("./routes/owner.routes");
const hostRoutes = require("./routes/host.routes");
const bookingRoutes = require("./routes/booking.routes");
const paymentRoutes = require("./routes/payment.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const reviewRoutes = require("./routes/review.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const notificationRoutes = require("./routes/notification.routes");
const chatRoutes = require("./routes/chat.routes");
const guestRoutes = require("./routes/guest.routes");
const supportRoutes = require("./routes/support.routes");
const errorHandler = require("./middleware/error.middleware");
const { corsOptions } = require("./config/cors");
const { globalApiLimiter } = require("./middleware/rateLimit.middleware");
const {
  requestContext,
  rejectMongoOperators,
} = require("./middleware/security.middleware");

const app = express();

// Render terminates HTTPS at its proxy. A fixed trust value keeps req.ip and
// express-rate-limit reliable without trusting arbitrary forwarded proxy hops.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));
app.set("query parser", "simple");
app.disable("x-powered-by");

app.use(requestContext);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
  })
);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "1mb", strict: true }));
app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
    parameterLimit: 100,
  })
);
app.use(rejectMongoOperators);
app.use(
  process.env.NODE_ENV === "production"
    ? morgan("combined")
    : morgan("dev")
);

app.get("/", (req, res) =>
  res.status(200).json({
    success: true,
    message: "hydewest API running",
    requestId: req.requestId,
  })
);

// Render uses this endpoint for health checks. Database ping prevents a process
// with a dead Mongo connection from being reported healthy.
app.get("/health", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB is not connected");
    }

    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      success: true,
      status: "healthy",
      database: "connected",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
});

app.use("/api", globalApiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/apartments", apartmentRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: "Route Not Found",
    requestId: req.requestId,
  })
);

app.use(errorHandler);

module.exports = app;