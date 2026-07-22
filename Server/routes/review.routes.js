const express = require("express");

const router = express.Router();



// ======================================
// Middleware
// ======================================

const authMiddleware = require("../middleware/auth.middleware");




// ======================================
// Controller
// ======================================

const {

  createReview,

  getApartmentReviews,

  deleteReview,

} = require("../controllers/review.controller");







// ======================================
// Review Routes
// ======================================




// Create Review

router.post(

  "/:apartmentId",

  authMiddleware,

  createReview

);







// Get Apartment Reviews

router.get(

  "/:apartmentId",

  getApartmentReviews

);







// Delete Review

router.delete(

  "/:reviewId",

  authMiddleware,

  deleteReview

);







module.exports = router;