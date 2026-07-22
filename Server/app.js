const reviewRoutes = require("./routes/review.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");


// Routes
const authRoutes = require("./routes/auth.routes");
const apartmentRoutes = require("./routes/apartment.routes");
const ownerRoutes = require("./routes/owner.routes");
const hostRoutes = require("./routes/host.routes");
const bookingRoutes = require("./routes/booking.routes");


// Middleware
const errorHandler = require("./middleware/error.middleware");

// Payment 
const paymentRoutes = require("./routes/payment.routes");

const app = express();



// ======================================
// Global Middlewares
// ======================================

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(helmet());

app.use(morgan("dev"));




// ======================================
// Health Check
// ======================================

app.get("/", (req, res) => {

  res.status(200).json({

    success: true,

    message: "StayNest API Running 🚀",

  });

});




// ======================================
// API Routes
// ======================================


// Authentication

app.use(
  "/api/auth",
  authRoutes
);



// Apartments

app.use(
  "/api/apartments",
  apartmentRoutes
);



// Owner

app.use(
  "/api/owner",
  ownerRoutes
);



// Host

app.use(
  "/api/host",
  hostRoutes
);



// Booking

app.use(
  "/api/bookings",
  bookingRoutes
);


// Payment Routes
app.use(
    "/api/payments",
    paymentRoutes
  );

// Wishlist

app.use(
    "/api/wishlist",
    wishlistRoutes
  );

  // Reviews

app.use(
    "/api/reviews",
    reviewRoutes
  );

  
// ======================================
// 404 Handler
// Always Before Error Handler
// ======================================

app.use((req, res) => {

  res.status(404).json({

    success: false,

    message: "Route Not Found",

  });

});




// ======================================
// Global Error Handler
// Always Last
// ======================================

app.use(errorHandler);



module.exports = app;