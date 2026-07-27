const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const PriceAlert = require("../models/priceAlert.model");
const SupportTicket = require("../models/supportTicket.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");
const {
  getGuestMembershipSummary,
  hasGuestBenefit,
} = require("../services/guestMembership.service");
const { getLoyaltySummary } = require("../services/loyalty.service");
const {
  getReferralSummary,
  trackReferralVisit,
} = require("../services/referral.service");

const APPROVED_LISTING = {
  status: APARTMENT_STATUS.APPROVED,
  isDeleted: false,
};

const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const activeApartmentIds = await Booking.distinct("apartment", {
    status: "confirmed",
    isDeleted: false,
    checkIn: { $lte: now },
    checkOut: { $gt: now },
  });

  const [approved, featured, recent, available, membership, loyalty] =
    await Promise.all([
      Apartment.find(APPROVED_LISTING)
        .populate("host", "name avatar isHost")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      Apartment.find({ ...APPROVED_LISTING, isFeatured: true })
        .populate("host", "name avatar isHost")
        .sort({ rating: -1, createdAt: -1 })
        .limit(8)
        .lean(),
      Apartment.find(APPROVED_LISTING)
        .populate("host", "name avatar isHost")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Apartment.find({
        ...APPROVED_LISTING,
        _id: { $nin: activeApartmentIds },
      })
        .populate("host", "name avatar isHost")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      getGuestMembershipSummary(req.user._id),
      getLoyaltySummary(req.user._id, 1, 5),
    ]);

  return sendResponse(res, 200, true, "Guest dashboard fetched.", {
    sections: { approved, featured, recent, available },
    counts: {
      approved: await Apartment.countDocuments(APPROVED_LISTING),
      featured: await Apartment.countDocuments({
        ...APPROVED_LISTING,
        isFeatured: true,
      }),
      available: await Apartment.countDocuments({
        ...APPROVED_LISTING,
        _id: { $nin: activeApartmentIds },
      }),
    },
    membership,
    loyalty,
  });
});

const getPriceAlerts = asyncHandler(async (req, res) => {
  const alerts = await PriceAlert.find({
    guest: req.user._id,
    isDeleted: false,
  })
    .populate("apartment", "title images location pricing premium status")
    .sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Price alerts fetched.", alerts);
});

const createPriceAlert = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "price_drop_alerts");
  if (!allowed) {
    return sendResponse(
      res,
      403,
      false,
      "Premium membership is required for price-drop alerts.",
      { code: "PREMIUM_REQUIRED" }
    );
  }

  const apartment = await Apartment.findOne({
    _id: req.body.apartmentId,
    ...APPROVED_LISTING,
  });

  if (!apartment) {
    return sendResponse(res, 404, false, "Property not found.");
  }

  const currentPrice = Number(
    apartment.pricing?.basePrice || apartment.pricing?.pricePerNight || 0
  );

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
    return sendResponse(
      res,
      403,
      false,
      "Premium membership is required for smart recommendations.",
      { code: "PREMIUM_REQUIRED" }
    );
  }

  const bookings = await Booking.find({
    guest: req.user._id,
    isDeleted: false,
  })
    .populate("apartment", "location propertyType amenities")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const lastApartment = bookings.find((item) => item.apartment)?.apartment;
  const query = { ...APPROVED_LISTING };

  if (lastApartment?.propertyType) {
    query.propertyType = lastApartment.propertyType;
  }
  if (lastApartment?.location?.city) {
    query["location.city"] = { $ne: lastApartment.location.city };
  }

  const recommendations = await Apartment.find(query)
    .populate("host", "name avatar")
    .sort({ rating: -1, bookingCount: -1, createdAt: -1 })
    .limit(10)
    .lean();

  return sendResponse(res, 200, true, "Smart recommendations fetched.", {
    reason: lastApartment
      ? `Because you explored ${
          lastApartment.location?.city || lastApartment.propertyType
        }.`
      : "Popular stays selected for you.",
    recommendations,
  });
});

const createTripPlan = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "ai_trip_planner");
  if (!allowed) {
    return sendResponse(
      res,
      403,
      false,
      "Premium membership is required for the trip planner.",
      { code: "PREMIUM_REQUIRED" }
    );
  }

  const city = String(req.body.city || "").trim();
  const budget = Math.max(Number(req.body.budget || 0), 0);
  const days = Math.max(Number(req.body.days || 1), 1);
  const guests = Math.max(Number(req.body.guests || 1), 1);
  const perStayBudget = budget > 0 ? budget / days : 0;
  const query = {
    ...APPROVED_LISTING,
    guests: { $gte: guests },
  };

  if (city) query["location.city"] = { $regex: city, $options: "i" };
  if (perStayBudget > 0) query["pricing.basePrice"] = { $lte: perStayBudget };

  const stays = await Apartment.find(query)
    .populate("host", "name avatar")
    .sort({ rating: -1 })
    .limit(6)
    .lean();

  const itinerary = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    morning:
      index === 0
        ? "Check in and explore the nearby area"
        : "Local sightseeing and breakfast",
    afternoon: "Visit a popular local attraction",
    evening: "Explore local food, markets, or a nearby viewpoint",
  }));

  return sendResponse(res, 200, true, "Trip plan generated.", {
    city,
    budget,
    days,
    guests,
    stays,
    itinerary,
  });
});

const getGuestOffers = asyncHandler(async (req, res) => {
  const now = new Date();
  const apartments = await Apartment.find({
    ...APPROVED_LISTING,
    "coupons.0": { $exists: true },
  })
    .select("title images location pricing premium coupons")
    .sort({ rating: -1, createdAt: -1 })
    .limit(50)
    .lean();

  const offers = [];

  apartments.forEach((apartment) => {
    (apartment.coupons || []).forEach((coupon) => {
      const validFrom = coupon.validFrom ? new Date(coupon.validFrom) : null;
      const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
      const usageAvailable =
        !Number(coupon.usageLimit || 0) ||
        Number(coupon.usedCount || 0) < Number(coupon.usageLimit || 0);

      if (
        !coupon.isActive ||
        !usageAvailable ||
        (validFrom && validFrom > now) ||
        (validUntil && validUntil < now)
      ) {
        return;
      }

      offers.push({
        id: `${apartment._id}:${coupon._id}`,
        apartmentId: apartment._id,
        propertyTitle: apartment.title,
        location: apartment.location,
        image: apartment.images?.[0] || null,
        code: coupon.code,
        label: coupon.label || coupon.code,
        description: coupon.description || "Apply this offer during booking.",
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        minBookingAmount: coupon.minBookingAmount,
        paymentMethod: coupon.paymentMethod || "any",
        premiumOnly: Boolean(coupon.premiumOnly),
        validUntil: coupon.validUntil,
      });
    });
  });

  return sendResponse(res, 200, true, "Guest offers fetched.", {
    all: offers,
    standard: offers.filter((item) => !item.premiumOnly),
    payment: offers.filter((item) => item.paymentMethod !== "any"),
    premium: offers.filter((item) => item.premiumOnly),
  });
});

const getTrendingDestinations = asyncHandler(async (req, res) => {
  const destinations = await Apartment.aggregate([
    { $match: APPROVED_LISTING },
    {
      $group: {
        _id: "$location.city",
        state: { $first: "$location.state" },
        properties: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        startingPrice: {
          $min: {
            $ifNull: ["$pricing.rates.day", "$pricing.basePrice"],
          },
        },
      },
    },
    { $match: { _id: { $nin: [null, ""] } } },
    { $sort: { properties: -1, averageRating: -1 } },
    { $limit: 8 },
  ]);

  return sendResponse(
    res,
    200,
    true,
    "Trending destinations fetched.",
    destinations.map((item) => ({
      city: item._id,
      state: item.state,
      properties: item.properties,
      averageRating: Number(Number(item.averageRating || 0).toFixed(1)),
      startingPrice: Number(item.startingPrice || 0),
    }))
  );
});

const getExclusiveListings = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "exclusive_properties");
  if (!allowed) {
    return sendResponse(
      res,
      403,
      false,
      "Premium membership is required for exclusive properties.",
      { code: "PREMIUM_REQUIRED" }
    );
  }

  const listings = await Apartment.find({
    ...APPROVED_LISTING,
    "premium.isExclusive": true,
  })
    .populate("host", "name avatar")
    .sort({ rating: -1, createdAt: -1 })
    .limit(12)
    .lean();

  return sendResponse(res, 200, true, "Exclusive listings fetched.", listings);
});

const trackReferral = asyncHandler(async (req, res) => {
  const referral = await trackReferralVisit(req.params.code);
  return sendResponse(
    res,
    200,
    true,
    referral ? "Referral visit recorded." : "Referral code was not found."
  );
});

const getMyReferral = asyncHandler(async (req, res) => {
  const allowed = await hasGuestBenefit(req.user._id, "referral_credits");
  if (!allowed) {
    return sendResponse(
      res,
      403,
      false,
      "Premium membership is required for referral rewards.",
      { code: "PREMIUM_REQUIRED" }
    );
  }

  const summary = await getReferralSummary(req.user);
  return sendResponse(res, 200, true, "Referral rewards fetched.", summary);
});

const createSupportTicket = asyncHandler(async (req, res) => {
  const category = String(req.body.category || "other").toLowerCase();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();
  const bookingId = req.body.bookingId || null;

  if (subject.length < 4 || message.length < 10) {
    return sendResponse(
      res,
      400,
      false,
      "Add a clear subject and a message of at least 10 characters."
    );
  }

  let booking = null;
  if (bookingId) {
    booking = await Booking.findOne({
      _id: bookingId,
      guest: req.user._id,
      isDeleted: false,
    });
    if (!booking) {
      return sendResponse(res, 404, false, "Selected booking was not found.");
    }
  }

  const priority = (await hasGuestBenefit(req.user._id, "priority_support"))
    ? "priority"
    : "standard";

  const ticketNumber = `HWS-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const ticket = await SupportTicket.create({
    ticketNumber,
    guest: req.user._id,
    booking: booking?._id || null,
    category: ["booking", "payment", "cancellation", "account", "other"].includes(
      category
    )
      ? category
      : "other",
    subject,
    message,
    priority,
  });

  return sendResponse(res, 201, true, "Support request created.", ticket);
});

const getSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({
    guest: req.user._id,
    isDeleted: false,
  })
    .populate("booking", "checkIn checkOut status")
    .sort({ createdAt: -1 })
    .lean();

  return sendResponse(res, 200, true, "Support requests fetched.", tickets);
});

module.exports = {
  createPriceAlert,
  createSupportTicket,
  createTripPlan,
  deletePriceAlert,
  getDashboard,
  getExclusiveListings,
  getGuestOffers,
  getMyReferral,
  getPriceAlerts,
  getSmartRecommendations,
  getSupportTickets,
  getTrendingDestinations,
  trackReferral,
};