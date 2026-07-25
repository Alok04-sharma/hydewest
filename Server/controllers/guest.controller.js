const asyncHandler = require("express-async-handler");
const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const PriceAlert = require("../models/priceAlert.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");
const { getGuestMembershipSummary, hasGuestBenefit } = require("../services/guestMembership.service");
const { getLoyaltySummary } = require("../services/loyalty.service");

const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const baseQuery = { status: APARTMENT_STATUS.APPROVED, isDeleted: false };
  const activeApartmentIds = await Booking.distinct("apartment", {
    status: "confirmed",
    isDeleted: false,
    checkIn: { $lte: now },
    checkOut: { $gt: now },
  });

  const [approved, featured, recent, available, membership, loyalty] = await Promise.all([
    Apartment.find(baseQuery).populate("host", "name avatar isHost").sort({ createdAt: -1 }).limit(12).lean(),
    Apartment.find({ ...baseQuery, isFeatured: true }).populate("host", "name avatar isHost").sort({ rating: -1, createdAt: -1 }).limit(8).lean(),
    Apartment.find(baseQuery).populate("host", "name avatar isHost").sort({ createdAt: -1 }).limit(8).lean(),
    Apartment.find({ ...baseQuery, _id: { $nin: activeApartmentIds } }).populate("host", "name avatar isHost").sort({ createdAt: -1 }).limit(8).lean(),
    getGuestMembershipSummary(req.user._id),
    getLoyaltySummary(req.user._id, 1, 5),
  ]);

  return sendResponse(res, 200, true, "Guest dashboard fetched.", {
    sections: { approved, featured, recent, available },
    counts: {
      approved: await Apartment.countDocuments(baseQuery),
      featured: await Apartment.countDocuments({ ...baseQuery, isFeatured: true }),
      available: await Apartment.countDocuments({ ...baseQuery, _id: { $nin: activeApartmentIds } }),
    },
    membership,
    loyalty,
  });
});

const getPriceAlerts = asyncHandler(async (req, res) => {
  const alerts = await PriceAlert.find({ guest: req.user._id, isDeleted: false })
    .populate("apartment", "title images location pricing premium status")
    .sort({ createdAt: -1 });
  return sendResponse(res, 200, true, "Price alerts fetched.", alerts);
});

const createPriceAlert = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "price_drop_alerts");
  if (!allowed) return sendResponse(res, 403, false, "Premium membership is required for price-drop alerts.", { code: "PREMIUM_REQUIRED" });

  const apartment = await Apartment.findOne({ _id: req.body.apartmentId, status: APARTMENT_STATUS.APPROVED, isDeleted: false });
  if (!apartment) return sendResponse(res, 404, false, "Property not found.");
  const currentPrice = Number(apartment.pricing?.basePrice || apartment.pricing?.pricePerNight || 0);
  const alert = await PriceAlert.findOneAndUpdate(
    { guest: req.user._id, apartment: apartment._id },
    {
      $set: {
        targetPrice: Math.max(Number(req.body.targetPrice || currentPrice), 0),
        lastSeenPrice: currentPrice,
        lastNotifiedAt: null,
        lastNotifiedPrice: null,
        isActive: true,
        isDeleted: false,
      },
      $setOnInsert: { guest: req.user._id, apartment: apartment._id },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return sendResponse(res, 200, true, "Price alert enabled.", alert);
});

const deletePriceAlert = asyncHandler(async (req, res) => {
  await PriceAlert.findOneAndUpdate(
    { _id: req.params.alertId, guest: req.user._id },
    { $set: { isDeleted: true, isActive: false } }
  );
  return sendResponse(res, 200, true, "Price alert removed.");
});

const getSmartRecommendations = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "smart_recommendations");
  if (!allowed) {
    return sendResponse(res, 403, false, "Premium membership is required for smart recommendations.", { code: "PREMIUM_REQUIRED" });
  }

  const bookings = await Booking.find({ guest: req.user._id, isDeleted: false })
    .populate("apartment", "location propertyType amenities")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const lastApartment = bookings.find((item) => item.apartment)?.apartment;
  const query = { status: APARTMENT_STATUS.APPROVED, isDeleted: false };
  if (lastApartment?.propertyType) query.propertyType = lastApartment.propertyType;
  if (lastApartment?.location?.city) query["location.city"] = { $ne: lastApartment.location.city };
  const recommendations = await Apartment.find(query)
    .populate("host", "name avatar")
    .sort({ rating: -1, bookingCount: -1, createdAt: -1 })
    .limit(10)
    .lean();
  return sendResponse(res, 200, true, "Smart recommendations fetched.", {
    reason: lastApartment
      ? `Because you explored ${lastApartment.location?.city || lastApartment.propertyType}.`
      : "Popular stays selected for you.",
    recommendations,
  });
});

const createTripPlan = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "ai_trip_planner");
  if (!allowed) return sendResponse(res, 403, false, "Premium membership is required for the trip planner.", { code: "PREMIUM_REQUIRED" });
  const city = String(req.body.city || "").trim();
  const budget = Math.max(Number(req.body.budget || 0), 0);
  const days = Math.max(Number(req.body.days || 1), 1);
  const guests = Math.max(Number(req.body.guests || 1), 1);
  const perStayBudget = budget > 0 ? budget / days : 0;
  const query = { status: APARTMENT_STATUS.APPROVED, isDeleted: false, guests: { $gte: guests } };
  if (city) query["location.city"] = { $regex: city, $options: "i" };
  if (perStayBudget > 0) query["pricing.basePrice"] = { $lte: perStayBudget };
  const stays = await Apartment.find(query).populate("host", "name avatar").sort({ rating: -1 }).limit(6).lean();
  const itinerary = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    morning: index === 0 ? "Check-in and explore the nearby area" : "Local sightseeing and breakfast",
    afternoon: "Visit a popular local attraction",
    evening: "Explore local food, market, or a nearby viewpoint",
  }));
  return sendResponse(res, 200, true, "Trip plan generated.", { city, budget, days, guests, stays, itinerary });
});

module.exports = {
  getDashboard,
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  getSmartRecommendations,
  createTripPlan,
};