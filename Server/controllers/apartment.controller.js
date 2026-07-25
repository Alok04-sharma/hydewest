

const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const sendResponse = require("../utils/sendResponse");
const generateUniqueSlug = require("../utils/generateSlug");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const deleteFromCloudinary = require("../utils/deleteFromCloudinary");
const { createAdminNotifications } = require("../services/notification.service");
const { calculateListingQuote } = require("../services/listingPricing.service");
const { generateRatesFromDailyPrice, cloneDefaultCouponPresets } = require("../constants/pricingPresets");

const JSON_FIELDS = [
  "location",
  "pricing",
  "coupons",
  "amenities",
  "houseRules",
  "availability",
  "policies",
  "existingImages",
  "newImageKeys",
  "imageOrder",
];

const parseJsonValue = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeCoupon = (coupon = {}) => ({
  code: String(coupon.code || "").trim().toUpperCase(),
  label: String(coupon.label || coupon.code || "").trim(),
  description: String(coupon.description || "").trim(),
  discountType: coupon.discountType === "fixed" ? "fixed" : "percentage",
  discountValue: Number(coupon.discountValue || 0),
  minBookingAmount: Number(coupon.minBookingAmount || 0),
  maxDiscount: Number(coupon.maxDiscount || 0),
  validFrom: coupon.validFrom || new Date(),
  validUntil: coupon.validUntil || null,
  usageLimit: Number(coupon.usageLimit || 0),
  usedCount: Number(coupon.usedCount || 0),
  isActive: coupon.isActive !== false,
  premiumOnly: coupon.premiumOnly === true,
  paymentMethod: ["upi", "card"].includes(String(coupon.paymentMethod || "").toLowerCase())
    ? String(coupon.paymentMethod).toLowerCase()
    : "any",
  source: coupon.source === "preset" ? "preset" : "custom",
});

const normalizePayload = (body = {}) => {
  const parsed = { ...body };

  JSON_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      parsed[field] = parseJsonValue(
        body[field],
        ["coupons", "amenities", "houseRules", "existingImages", "newImageKeys", "imageOrder"].includes(field)
          ? []
          : {}
      );
    }
  });

  const pricing = parsed.pricing || {};
  const dailyPrice = Number(
    pricing.rates?.day || pricing.basePrice || pricing.pricePerNight || 0
  );
  const rates = generateRatesFromDailyPrice(dailyPrice, pricing.rates || {});
  const suppliedCoupons = Array.isArray(parsed.coupons)
    ? parsed.coupons
    : cloneDefaultCouponPresets();

  return {
    title: String(parsed.title || "").trim(),
    description: String(parsed.description || "").trim(),
    propertyType: String(parsed.propertyType || "").trim(),
    guests: Number(parsed.guests || 1),
    bedrooms: Number(parsed.bedrooms ?? 1),
    beds: Number(parsed.beds || 1),
    bathrooms: Number(parsed.bathrooms || 1),
    location: {
      country: String(parsed.location?.country || "").trim(),
      state: String(parsed.location?.state || "").trim(),
      city: String(parsed.location?.city || "").trim(),
      address: String(parsed.location?.address || "").trim(),
      landmark: String(parsed.location?.landmark || "").trim(),
      zipCode: String(parsed.location?.zipCode || "").trim(),
      latitude: Number(parsed.location?.latitude),
      longitude: Number(parsed.location?.longitude),
    },
    pricing: {
      basePrice: rates.day,
      pricePerNight: rates.night,
      priceUnit: "day",
      rates,
      autoRateMultipliers: pricing.autoRateMultipliers !== false,
      cleaningFee: Number(pricing.cleaningFee || 0),
      serviceFee: Number(pricing.serviceFee || 0),
      extraGuestFee: Number(pricing.extraGuestFee || 0),
      baseGuestCount: Number(pricing.baseGuestCount || parsed.guests || 1),
      currency: String(pricing.currency || "INR").toUpperCase(),
    },
    coupons: suppliedCoupons
      .map(normalizeCoupon)
      .filter((coupon) => coupon.code),
    amenities: Array.isArray(parsed.amenities)
      ? parsed.amenities.map((item) => String(item).trim()).filter(Boolean)
      : [],
    houseRules: Array.isArray(parsed.houseRules)
      ? parsed.houseRules.map((item) => String(item).trim()).filter(Boolean)
      : [],
    availability: {
      availableFrom: parsed.availability?.availableFrom,
      availableTo: parsed.availability?.availableTo,
      blockedDates: Array.isArray(parsed.availability?.blockedDates)
        ? parsed.availability.blockedDates
        : [],
    },
    policies: {
      minBookingDays: Number(parsed.policies?.minBookingDays || 1),
      maxBookingDays: Number(parsed.policies?.maxBookingDays || 365),
      cancellationPolicy: String(
        parsed.policies?.cancellationPolicy || "moderate"
      ),
      checkInTime: String(parsed.policies?.checkInTime || "14:00"),
      checkOutTime: String(parsed.policies?.checkOutTime || "11:00"),
    },
    timezone: String(parsed.timezone || "Asia/Kolkata"),
    existingImages: Array.isArray(parsed.existingImages) ? parsed.existingImages : [],
    newImageKeys: Array.isArray(parsed.newImageKeys) ? parsed.newImageKeys : [],
    imageOrder: Array.isArray(parsed.imageOrder) ? parsed.imageOrder : [],
    coverImageKey: String(parsed.coverImageKey || ""),
  };
};

const validateListingPayload = (data) => {
  const errors = [];

  if (data.title.length < 10) errors.push("Property title must be at least 10 characters.");
  if (data.description.length < 50) errors.push("Description must be at least 50 characters.");
  if (!data.propertyType) errors.push("Property type is required.");
  if (data.guests < 1) errors.push("At least one guest must be allowed.");
  if (data.beds < 1) errors.push("At least one bed is required.");
  if (data.bathrooms < 1) errors.push("At least one bathroom is required.");
  if (!data.location.city || !data.location.address || !data.location.state || !data.location.country) {
    errors.push("Complete property location is required.");
  }
  if (!Number.isFinite(data.location.latitude) || !Number.isFinite(data.location.longitude)) {
    errors.push("Valid latitude and longitude are required.");
  } else if (
    data.location.latitude < -90 ||
    data.location.latitude > 90 ||
    data.location.longitude < -180 ||
    data.location.longitude > 180
  ) {
    errors.push("Latitude or longitude is outside the valid range.");
  }
  if (data.pricing.basePrice <= 0) errors.push("Per-day price must be greater than zero.");
  Object.entries(data.pricing.rates || {}).forEach(([unit, amount]) => {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      errors.push(`${unit} price must be greater than zero.`);
    }
  });
  if (data.pricing.baseGuestCount > data.guests) {
    errors.push("Included guest count cannot exceed maximum guests.");
  }
  if (data.policies.maxBookingDays < data.policies.minBookingDays) {
    errors.push("Maximum booking days cannot be less than minimum booking days.");
  }
  if (!data.availability.availableFrom || !data.availability.availableTo) {
    errors.push("Property availability dates are required.");
  }
  if (
    data.availability.availableFrom &&
    data.availability.availableTo &&
    new Date(data.availability.availableTo) <= new Date(data.availability.availableFrom)
  ) {
    errors.push("Available-to date must be after available-from date.");
  }

  const couponCodes = data.coupons.map((coupon) => coupon.code);
  if (new Set(couponCodes).size !== couponCodes.length) {
    errors.push("Coupon codes must be unique.");
  }

  data.coupons.forEach((coupon) => {
    if (coupon.discountValue <= 0) {
      errors.push(`Coupon ${coupon.code} must have a valid discount value.`);
    }
    if (coupon.discountType === "percentage" && coupon.discountValue > 100) {
      errors.push(`Coupon ${coupon.code} percentage cannot exceed 100.`);
    }
    if (coupon.validUntil && new Date(coupon.validUntil) <= new Date(coupon.validFrom)) {
      errors.push(`Coupon ${coupon.code} expiry must be after its start date.`);
    }
  });

  return errors;
};

const uploadNewImages = async (files = [], keys = []) => {
  const uploaded = [];

  for (let index = 0; index < files.length; index += 1) {
    const result = await uploadToCloudinary(files[index].buffer, "StayNest/Apartments");
    uploaded.push({
      ...result,
      clientKey: keys[index] || `new-${index}`,
    });
  }

  return uploaded;
};

const arrangeImages = ({ existingImages, uploadedImages, imageOrder, coverImageKey }) => {
  const imageMap = new Map();

  existingImages.forEach((image, index) => {
    const clientKey = image.clientKey || `existing-${image.publicId || index}`;
    imageMap.set(clientKey, {
      url: image.url,
      publicId: image.publicId,
      clientKey,
    });
  });

  uploadedImages.forEach((image) => imageMap.set(image.clientKey, image));

  const orderedKeys = [
    ...imageOrder.filter((key) => imageMap.has(key)),
    ...Array.from(imageMap.keys()).filter((key) => !imageOrder.includes(key)),
  ];

  const effectiveCover = imageMap.has(coverImageKey) ? coverImageKey : orderedKeys[0];

  return orderedKeys.map((key, index) => {
    const image = imageMap.get(key);
    return {
      url: image.url,
      publicId: image.publicId,
      isCover: key === effectiveCover,
      order: index,
    };
  });
};

const pushListingHistory = (apartment, entry) => {
  if (!Array.isArray(apartment.statusHistory)) apartment.statusHistory = [];
  apartment.statusHistory.push({
    status: apartment.status,
    changedBy: entry.changedBy || null,
    changedAt: new Date(),
    action: entry.action,
    reason: entry.reason || "",
  });
};

const createApartment = asyncHandler(async (req, res) => {
  const hostId = req.user?._id || req.user?.id;
  const apartmentData = normalizePayload(req.body);
  const errors = validateListingPayload(apartmentData);

  if (!hostId) return sendResponse(res, 401, false, "Unauthorized host account.");
  if (errors.length) return sendResponse(res, 400, false, errors[0], { errors });
  if (!req.files || req.files.length < 3) {
    return sendResponse(res, 400, false, "At least three property images are required.");
  }

  apartmentData.coupons = apartmentData.coupons.map((coupon) => ({
    ...coupon,
    usedCount: 0,
  }));

  const uploadedImages = await uploadNewImages(req.files, apartmentData.newImageKeys);
  const images = arrangeImages({
    existingImages: [],
    uploadedImages,
    imageOrder: apartmentData.imageOrder,
    coverImageKey: apartmentData.coverImageKey,
  });

  const slug = await generateUniqueSlug(apartmentData.title);
  const apartment = await Apartment.create({
    ...apartmentData,
    existingImages: undefined,
    newImageKeys: undefined,
    imageOrder: undefined,
    coverImageKey: undefined,
    slug,
    host: hostId,
    images,
    status: APARTMENT_STATUS.PENDING,
    isDeleted: false,
    priceHistory: [
      {
        amount: apartmentData.pricing.basePrice,
        priceUnit: apartmentData.pricing.priceUnit,
        recordedAt: new Date(),
      },
    ],
    statusHistory: [
      {
        status: APARTMENT_STATUS.PENDING,
        action: "submitted_for_review",
        reason: "New listing submitted by host.",
        changedBy: hostId,
        changedAt: new Date(),
      },
    ],
  });

  await createAdminNotifications({
    type: NOTIFICATION_TYPE.NEW_LISTING_PENDING_APPROVAL,
    title: "New listing pending approval",
    message: `${req.user?.name || req.user?.email || "A host"} submitted “${apartment.title}” for review.`,
    actor: hostId,
    entityType: "Apartment",
    entityId: apartment._id,
    actionUrl: `/owner/listings/${apartment._id}`,
    metadata: {
      listingId: apartment._id,
      hostId,
      propertyType: apartment.propertyType,
      city: apartment.location?.city || "",
    },
  });

  return sendResponse(
    res,
    201,
    true,
    "Property submitted successfully for Super Admin approval.",
    apartment
  );
});

const getAllApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  })
    .populate("host", "name email avatar")
    .sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Apartments fetched successfully.", apartments);
});

const getApartmentDetails = asyncHandler(async (req, res) => {
  const apartment = await Apartment.findOneAndUpdate(
    {
      _id: req.params.id,
      status: APARTMENT_STATUS.APPROVED,
      isDeleted: false,
    },
    { $inc: { views: 1 } },
    { new: true }
  ).populate("host", "name email avatar createdAt");

  if (!apartment) {
    return sendResponse(res, 404, false, "Approved apartment not found or unavailable.");
  }

  return sendResponse(res, 200, true, "Apartment details fetched successfully.", apartment);
});

const getHostApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Host apartments fetched successfully.", apartments);
});

const getHostApartmentDetails = asyncHandler(async (req, res) => {
  const apartment = await Apartment.findOne({
    _id: req.params.id,
    host: req.user._id,
    isDeleted: false,
  });

  if (!apartment) {
    return sendResponse(res, 404, false, "Property not found or unauthorized.");
  }

  return sendResponse(res, 200, true, "Host property fetched successfully.", apartment);
});

const updateApartment = asyncHandler(async (req, res) => {
  const hostId = req.user?._id || req.user?.id;
  const apartment = await Apartment.findOne({
    _id: req.params.id,
    host: hostId,
    isDeleted: false,
  });

  if (!apartment) {
    return sendResponse(res, 404, false, "Apartment not found or unauthorized.");
  }

  if (apartment.status === APARTMENT_STATUS.SUSPENDED) {
    return sendResponse(
      res,
      403,
      false,
      "Suspended listing cannot be edited. Please contact platform support."
    );
  }

  const apartmentData = normalizePayload(req.body);
  const existingCouponUsage = new Map(
    (apartment.coupons || []).map((coupon) => [
      String(coupon.code || "").toUpperCase(),
      Number(coupon.usedCount || 0),
    ])
  );
  apartmentData.coupons = apartmentData.coupons.map((coupon) => ({
    ...coupon,
    usedCount: existingCouponUsage.get(coupon.code) || 0,
  }));

  const errors = validateListingPayload(apartmentData);
  if (errors.length) return sendResponse(res, 400, false, errors[0], { errors });

  const retainedPublicIds = new Set(
    apartmentData.existingImages.map((image) => image.publicId).filter(Boolean)
  );
  const removedImages = apartment.images.filter(
    (image) => image.publicId && !retainedPublicIds.has(image.publicId)
  );

  const uploadedImages = await uploadNewImages(req.files || [], apartmentData.newImageKeys);
  const images = arrangeImages({
    existingImages: apartmentData.existingImages,
    uploadedImages,
    imageOrder: apartmentData.imageOrder,
    coverImageKey: apartmentData.coverImageKey,
  });

  if (images.length < 3) {
    return sendResponse(res, 400, false, "At least three property images must remain.");
  }

  if (images.length > 10) {
    return sendResponse(res, 400, false, "Maximum ten property images are allowed.");
  }

  if (apartmentData.title !== apartment.title) {
    apartment.slug = await generateUniqueSlug(apartmentData.title);
  }

  const previousStatus = apartment.status;
  const previousBasePrice = Number(
    apartment.pricing?.basePrice || apartment.pricing?.pricePerNight || 0
  );
  const editableFields = [
    "title",
    "description",
    "propertyType",
    "guests",
    "bedrooms",
    "beds",
    "bathrooms",
    "location",
    "pricing",
    "coupons",
    "amenities",
    "houseRules",
    "availability",
    "policies",
    "timezone",
  ];

  editableFields.forEach((field) => {
    apartment[field] = apartmentData[field];
  });
  apartment.images = images;

  const nextBasePrice = Number(apartmentData.pricing?.basePrice || 0);
  if (nextBasePrice > 0 && nextBasePrice !== previousBasePrice) {
    apartment.priceHistory.push({
      amount: nextBasePrice,
      priceUnit: apartmentData.pricing?.priceUnit || "night",
      recordedAt: new Date(),
    });

    if (apartment.priceHistory.length > 36) {
      apartment.priceHistory = apartment.priceHistory.slice(-36);
    }
  }

  if (
    [
      APARTMENT_STATUS.APPROVED,
      APARTMENT_STATUS.REJECTED,
      APARTMENT_STATUS.INACTIVE,
    ].includes(previousStatus)
  ) {
    apartment.status = APARTMENT_STATUS.PENDING;
    apartment.isFeatured = false;
    apartment.moderation.reviewedBy = null;
    apartment.moderation.reviewedAt = null;
    apartment.moderation.approvedAt = null;

    pushListingHistory(apartment, {
      changedBy: hostId,
      action: "resubmitted_after_host_update",
      reason: `Listing changed from ${previousStatus} and requires review again.`,
    });
  } else {
    pushListingHistory(apartment, {
      changedBy: hostId,
      action: "host_updated_listing",
      reason: "Host updated listing information.",
    });
  }

  await apartment.save();

  await Promise.all(removedImages.map((image) => deleteFromCloudinary(image.publicId)));

  if (apartment.status === APARTMENT_STATUS.PENDING) {
    await createAdminNotifications({
      type: NOTIFICATION_TYPE.NEW_LISTING_PENDING_APPROVAL,
      title: "Listing pending approval",
      message: `${req.user?.name || req.user?.email || "A host"} updated “${apartment.title}” and submitted it for review.`,
      actor: hostId,
      entityType: "Apartment",
      entityId: apartment._id,
      actionUrl: `/owner/listings/${apartment._id}`,
      metadata: { listingId: apartment._id, hostId, previousStatus },
    });
  }

  return sendResponse(
    res,
    200,
    true,
    apartment.status === APARTMENT_STATUS.PENDING
      ? "Property updated and submitted for Super Admin review."
      : "Property updated successfully.",
    apartment
  );
});

const deleteApartment = asyncHandler(async (req, res) => {
  const apartment = await Apartment.findOne({
    _id: req.params.id,
    host: req.user._id,
    isDeleted: false,
  });

  if (!apartment) return sendResponse(res, 404, false, "Apartment not found.");

  apartment.isDeleted = true;
  apartment.status = APARTMENT_STATUS.INACTIVE;
  apartment.isFeatured = false;
  apartment.moderation.removedAt = new Date();
  apartment.moderation.removedBy = req.user._id;
  apartment.moderation.removalReason = "Removed by host.";

  pushListingHistory(apartment, {
    changedBy: req.user._id,
    action: "removed_by_host",
    reason: "Host removed the listing.",
  });

  await apartment.save();
  return sendResponse(res, 200, true, "Apartment deleted successfully.");
});

const getListingQuote = asyncHandler(async (req, res) => {
  const apartment = await Apartment.findOne({
    _id: req.params.id,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  });

  if (!apartment) return sendResponse(res, 404, false, "Apartment not available.");

  try {
    const quote = calculateListingQuote({
      apartment,
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
      guestsCount: req.body.guestsCount,
      couponCode: req.body.couponCode,
      bookingUnit: req.body.bookingUnit,
      paymentMethod: req.body.paymentMethod,
    });

    return sendResponse(res, 200, true, "Booking quote calculated successfully.", quote);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
});

const searchApartments = asyncHandler(async (req, res) => {
  const {
    city,
    location,
    state,
    country,
    minPrice,
    maxPrice,
    guests,
    bedrooms,
    propertyType,
    amenities,
    minRating,
    priceUnit,
    checkIn,
    checkOut,
    instantBook,
    selfCheckIn,
    petFriendly,
    superLuxury,
    premiumExclusive,
    sortBy = "newest",
  } = req.query;

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
  const query = { status: APARTMENT_STATUS.APPROVED, isDeleted: false };

  if (city) query["location.city"] = { $regex: city, $options: "i" };
  if (state) query["location.state"] = { $regex: state, $options: "i" };
  if (country) query["location.country"] = { $regex: country, $options: "i" };
  if (location) {
    const matcher = { $regex: location, $options: "i" };
    query.$or = [
      { "location.city": matcher },
      { "location.state": matcher },
      { "location.address": matcher },
      { "location.landmark": matcher },
    ];
  }
  const selectedPriceUnit = ["hour", "night", "day", "week", "month"].includes(String(priceUnit || "").toLowerCase())
    ? String(priceUnit).toLowerCase()
    : "day";
  const pricePath = `pricing.rates.${selectedPriceUnit}`;
  if (minPrice || maxPrice) {
    query[pricePath] = {};
    if (minPrice) query[pricePath].$gte = Number(minPrice);
    if (maxPrice) query[pricePath].$lte = Number(maxPrice);
  }
  if (guests) query.guests = { $gte: Number(guests) };
  if (bedrooms) query.bedrooms = { $gte: Number(bedrooms) };
  if (propertyType) query.propertyType = propertyType;
  if (amenities) {
    query.amenities = {
      $all: String(amenities).split(",").map((item) => item.trim()).filter(Boolean),
    };
  }
  if (minRating) query.rating = { $gte: Number(minRating) };
  if (instantBook === "true") query["features.instantBook"] = true;
  if (selfCheckIn === "true") query["features.selfCheckIn"] = true;
  if (petFriendly === "true") query["features.petFriendly"] = true;
  if (superLuxury === "true") query["features.superLuxury"] = true;
  if (premiumExclusive === "true") query["premium.isExclusive"] = true;

  if (checkIn && checkOut) {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate > startDate) {
      const bookedIds = await Booking.distinct("apartment", {
        isDeleted: false,
        status: { $in: ["pending", "confirmed"] },
        checkIn: { $lt: endDate },
        checkOut: { $gt: startDate },
      });
      query._id = { $nin: bookedIds };
      query["availability.availableFrom"] = { $lte: startDate };
      query["availability.availableTo"] = { $gte: endDate };
      query["availability.blockedDates"] = { $not: { $elemMatch: { $gte: startDate, $lt: endDate } } };
    }
  }

  const sortMap = {
    price_low: { "pricing.basePrice": 1 },
    price_high: { "pricing.basePrice": -1 },
    rating: { rating: -1, totalReviews: -1 },
    popular: { bookingCount: -1, wishlistCount: -1 },
    cleaning_low: { "pricing.cleaningFee": 1, rating: -1 },
    best_value: { "premium.discountPercent": -1, rating: -1, "pricing.basePrice": 1 },
    newest: { createdAt: -1 },
  };
  const skip = (page - 1) * limit;
  const [apartments, total] = await Promise.all([
    Apartment.find(query)
      .populate("host", "name email avatar isHost createdAt")
      .sort(sortMap[sortBy] || sortMap.newest)
      .skip(skip)
      .limit(limit),
    Apartment.countDocuments(query),
  ]);

  return sendResponse(res, 200, true, "Apartments fetched successfully.", {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    apartments,
  });
});

module.exports = {
  createApartment,
  getAllApartments,
  getApartmentDetails,
  getHostApartments,
  getHostApartmentDetails,
  updateApartment,
  deleteApartment,
  getListingQuote,
  searchApartments,
};