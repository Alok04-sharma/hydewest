const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const {
  getBookingQuote,
  createBooking,
  getMyBookings,
  getMyBookingDetails,
  getHostBookings,
  cancelBooking,
} = require("../controllers/booking.controller");

const router = express.Router();

router.post(
  "/quote",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  getBookingQuote
);

router.post(
  "/create",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  createBooking
);

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  getMyBookings
);

router.get(
  "/my/:id",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  getMyBookingDetails
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware(ROLES.GUEST),
  cancelBooking
);

router.get(
  "/host",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  getHostBookings
);

module.exports = router;