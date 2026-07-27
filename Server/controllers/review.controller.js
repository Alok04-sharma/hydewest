const asyncHandler = require("express-async-handler");

const Review = require("../models/review.model");
const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const sendResponse = require("../utils/sendResponse");
const { getActiveGuestMembership } = require("../services/guestMembership.service");

const updateApartmentRating = async (apartmentId) => {
  const rows = await Review.aggregate([
    {
      $match: {
        apartment: apartmentId,
        status: "published",
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$apartment",
        rating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const summary = rows[0] || { rating: 0, totalReviews: 0 };
  await Apartment.updateOne(
    { _id: apartmentId },
    {
      $set: {
        rating: Number(Number(summary.rating || 0).toFixed(1)),
        totalReviews: Number(summary.totalReviews || 0),
      },
    }
  );
};

const getEligibleReviewBookings = asyncHandler(async (req, res) => {
  const reviewedBookingIds = await Review.distinct("booking", {
    user: req.user._id,
    isDeleted: false,
  });

  const bookings = await Booking.find({
    guest: req.user._id,
    status: "completed",
    isDeleted: false,
    _id: { $nin: reviewedBookingIds },
  })
    .populate("apartment", "title images location host")
    .populate("host", "name avatar")
    .sort({ checkOut: -1 })
    .lean();

  return sendResponse(
    res,
    200,
    true,
    "Review-eligible bookings fetched successfully.",
    bookings
  );
});

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    user: req.user._id,
    isDeleted: false,
  })
    .populate("apartment", "title images location")
    .populate("booking", "checkIn checkOut status")
    .sort({ createdAt: -1 })
    .lean();

  return sendResponse(res, 200, true, "Your reviews were fetched.", reviews);
});

const createReview = asyncHandler(async (req, res) => {
  const { apartmentId } = req.params;
  const bookingId = String(req.body.bookingId || "").trim();
  const rating = Number(req.body.rating || 0);
  const comment = String(req.body.comment || "").trim();

  if (!bookingId || rating < 1 || rating > 5 || comment.length < 5) {
    return sendResponse(
      res,
      400,
      false,
      "Select a completed booking, choose a rating, and write at least 5 characters."
    );
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    guest: req.user._id,
    apartment: apartmentId,
    status: "completed",
    isDeleted: false,
  });

  if (!booking) {
    return sendResponse(
      res,
      400,
      false,
      "Only your completed bookings can be reviewed."
    );
  }

  const existingReview = await Review.findOne({
    booking: bookingId,
    isDeleted: false,
  });

  if (existingReview) {
    return sendResponse(res, 409, false, "This booking has already been reviewed.");
  }

  const membership = await getActiveGuestMembership(req.user._id);

  const review = await Review.create({
    user: req.user._id,
    apartment: apartmentId,
    booking: bookingId,
    rating,
    comment,
    isPremiumReview: Boolean(membership),
  });

  await updateApartmentRating(booking.apartment);
  await review.populate("apartment", "title images location");

  return sendResponse(res, 201, true, "Review published successfully.", review);
});

const getApartmentReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    apartment: req.params.apartmentId,
    status: "published",
    isDeleted: false,
  })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  return sendResponse(res, 200, true, "Reviews fetched successfully.", reviews);
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({
    _id: req.params.reviewId,
    user: req.user._id,
    isDeleted: false,
  });

  if (!review) {
    return sendResponse(res, 404, false, "Review not found.");
  }

  await Review.updateOne(
    { _id: review._id },
    { $set: { isDeleted: true, status: "hidden" } }
  );
  await updateApartmentRating(review.apartment);

  return sendResponse(res, 200, true, "Review deleted successfully.");
});

module.exports = {
  createReview,
  deleteReview,
  getApartmentReviews,
  getEligibleReviewBookings,
  getMyReviews,
};