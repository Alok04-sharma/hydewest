const express = require("express");

const router = express.Router();


// ======================================
// Middleware
// ======================================

const authMiddleware = require("../middleware/auth.middleware");

const roleMiddleware = require("../middleware/role.middleware");


// ======================================
// Controller
// ======================================

const {
  createBooking,
  getMyBookings,
  getHostBookings,
  cancelBooking,
} = require("../controllers/booking.controller");


// ======================================
// Constants
// ======================================

const ROLES = require("../constants/roles");



// ======================================
// Guest Routes
// ======================================


// Create Booking

router.post(
  "/create",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  createBooking
);



// Get My Bookings

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  getMyBookings
);



// Cancel Booking

router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  cancelBooking
);




// ======================================
// Host Routes
// ======================================


// Get Host Bookings

router.get(
  "/host",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  getHostBookings
);



module.exports = router;