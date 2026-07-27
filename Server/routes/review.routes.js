const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const {
  createReview,
  deleteReview,
  getApartmentReviews,
  getEligibleReviewBookings,
  getMyReviews,
} = require("../controllers/review.controller");

const router = express.Router();

router.get("/apartment/:apartmentId", getApartmentReviews);

router.use(authMiddleware, roleMiddleware(ROLES.GUEST));
router.get("/me", getMyReviews);
router.get("/eligible-bookings", getEligibleReviewBookings);
router.post("/:apartmentId", createReview);
router.delete("/:reviewId", deleteReview);

module.exports = router;