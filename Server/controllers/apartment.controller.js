const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");
const User = require("../models/user.model");
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
  "guestCapacity",
  "bedDetails",
  "bathroomDetails",
  "location",
  "pricing",
  "coupons",
  "amenities",
  "houseRules",
  "nearbyInformation",
  "applianceGuide",
  "availability",
  "policies",
  "existingImages",
  "newImageKeys",
  "imageOrder",
  "existingVideos",
  "newVideoKeys",
  "videoOrder",
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

const toOptionalCoordinate = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const normalizePayload = (body = {}) => {
  const parsed = { ...body };

  JSON_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      parsed[field] = parseJsonValue(
        body[field],
        ["bedDetails", "coupons", "amenities", "houseRules", "applianceGuide", "existingImages", "newImageKeys", "imageOrder", "existingVideos", "newVideoKeys", "videoOrder"].includes(field)
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
    guestCapacity: {
      adults: Number(parsed.guestCapacity?.adults || parsed.guests || 1),
      children: Number(parsed.guestCapacity?.children || 0),
      seniorCitizens: Number(parsed.guestCapacity?.seniorCitizens || 0),
    },
    bedrooms: Number(parsed.bedrooms ?? 1),
    beds: Number(parsed.beds || 1),
    bedDetails: Array.isArray(parsed.bedDetails)
      ? parsed.bedDetails
          .map((item) => ({
            type: String(item.type || "Single"),
            count: Number(item.count || 1),
            capacityPerBed: Number(item.capacityPerBed || 1),
          }))
          .filter((item) => item.count > 0)
      : [],
    bathrooms: Number(parsed.bathrooms || 1),
    bathroomDetails: {
      western: Number(parsed.bathroomDetails?.western || 0),
      indian: Number(parsed.bathroomDetails?.indian || 0),
      shower: Number(parsed.bathroomDetails?.shower || 0),
      bathtub: Number(parsed.bathroomDetails?.bathtub || 0),
      hotWater: parsed.bathroomDetails?.hotWater === true,
      accessible: parsed.bathroomDetails?.accessible === true,
      sunflowerFriendly: parsed.bathroomDetails?.sunflowerFriendly === true,
      notes: String(parsed.bathroomDetails?.notes || "").trim(),
    },
    location: {
      country: String(parsed.location?.country || "").trim(),
      state: String(parsed.location?.state || "").trim(),
      city: String(parsed.location?.city || "").trim(),
      area: String(parsed.location?.area || "").trim(),
      address: String(parsed.location?.address || "").trim(),
      landmark: String(parsed.location?.landmark || "").trim(),
      zipCode: String(parsed.location?.zipCode || "").trim(),
      latitude: toOptionalCoordinate(parsed.location?.latitude),
      longitude: toOptionalCoordinate(parsed.location?.longitude),
    },
    propertyStyle: String(parsed.propertyStyle || "Modern").trim(),
    nearbyInformation: {
      nearestAirport: String(parsed.nearbyInformation?.nearestAirport || "").trim(),
      railwayStation: String(parsed.nearbyInformation?.railwayStation || "").trim(),
      busStand: String(parsed.nearbyInformation?.busStand || "").trim(),
      metro: String(parsed.nearbyInformation?.metro || "").trim(),
      nearbyMarket: String(parsed.nearbyInformation?.nearbyMarket || "").trim(),
      groceryStore: String(parsed.nearbyInformation?.groceryStore || "").trim(),
      hospital: String(parsed.nearbyInformation?.hospital || "").trim(),
      medicalStore: String(parsed.nearbyInformation?.medicalStore || "").trim(),
      parking: String(parsed.nearbyInformation?.parking || "").trim(),
      internet: String(parsed.nearbyInformation?.internet || "").trim(),
      powerBackup: String(parsed.nearbyInformation?.powerBackup || "").trim(),
      otherFacilities: Array.isArray(parsed.nearbyInformation?.otherFacilities)
        ? parsed.nearbyInformation.otherFacilities.map((item) => String(item).trim()).filter(Boolean)
        : [],
    },
    applianceGuide: Array.isArray(parsed.applianceGuide)
      ? parsed.applianceGuide
          .map((item) => ({
            appliance: String(item.appliance || "").trim(),
            instructions: String(item.instructions || "").trim(),
          }))
          .filter((item) => item.appliance && item.instructions)
      : [],
    pricing: {
      basePrice: rates.day,
      pricePerNight: rates.night,
      priceUnit: "day",
      rates: {
        ...rates,
        hour: Number(parsed.policies?.minBookingDays || 1) > 1 ? 0 : rates.hour,
      },
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
      unavailableDates: Array.isArray(parsed.availability?.unavailableDates)
        ? parsed.availability.unavailableDates
        : [],
      specialPrices: Array.isArray(parsed.availability?.specialPrices)
        ? parsed.availability.specialPrices
            .map((item) => ({
              date: item.date,
              price: Number(item.price || 0),
              note: String(item.note || "").trim(),
            }))
            .filter((item) => item.date && item.price > 0)
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
    existingVideos: Array.isArray(parsed.existingVideos) ? parsed.existingVideos : [],
    newVideoKeys: Array.isArray(parsed.newVideoKeys) ? parsed.newVideoKeys : [],
    videoOrder: Array.isArray(parsed.videoOrder) ? parsed.videoOrder : [],
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
  const hasLatitude = Number.isFinite(data.location.latitude);
  const hasLongitude = Number.isFinite(data.location.longitude);

  if (hasLatitude !== hasLongitude) {
    errors.push("Provide both latitude and longitude, or leave both empty and use the manual address.");
  } else if (
    hasLatitude &&
    (data.location.latitude < -90 ||
      data.location.latitude > 90 ||
      data.location.longitude < -180 ||
      data.location.longitude > 180)
  ) {
    errors.push("Latitude or longitude is outside the valid range.");
  }
  if (data.pricing.basePrice <= 0) errors.push("Per-day price must be greater than zero.");
  Object.entries(data.pricing.rates || {}).forEach(([unit, amount]) => {
    const hourlyDisabled =
      unit === "hour" && Number(data.policies?.minBookingDays || 1) > 1;
    if (
      !Number.isFinite(Number(amount)) ||
      (!hourlyDisabled && Number(amount) <= 0) ||
      (hourlyDisabled && Number(amount) < 0)
    ) {
      errors.push(`${unit} price must be configured correctly.`);
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

const getUploadedFiles = (req, field) => {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return field === "images" ? req.files : [];
  return Array.isArray(req.files[field]) ? req.files[field] : [];
};

const cleanupUploadedMedia = async (items = [], resourceType) => {
  await Promise.all(
    items
      .filter((item) => item?.publicId)
      .map((item) => deleteFromCloudinary(item.publicId, resourceType))
  );
};

const uploadNewMedia = async ({ files = [], keys = [], resourceType, folder }) => {
  const uploaded = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (resourceType === "image" && file.size > 8 * 1024 * 1024) {
        throw new Error("Each property image must be 8 MB or smaller.");
      }

      const result = await uploadToCloudinary(file.buffer, folder, {
        mimetype: file.mimetype,
        resourceType,
      });

      uploaded.push({
        ...result,
        clientKey: keys[index] || `new-${resourceType}-${index}`,
      });
    }

    return uploaded;
  } catch (error) {
    await cleanupUploadedMedia(uploaded, resourceType);
    throw error;
  }
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

const arrangeVideos = ({ existingVideos, uploadedVideos, videoOrder }) => {
  const videoMap = new Map();

  existingVideos.forEach((video, index) => {
    const clientKey = video.clientKey || `existing-video-${video.publicId || index}`;
    videoMap.set(clientKey, {
      url: video.url,
      publicId: video.publicId,
      thumbnailUrl: video.thumbnailUrl || "",
      duration: Number(video.duration || 0),
      clientKey,
    });
  });

  uploadedVideos.forEach((video) => videoMap.set(video.clientKey, video));

  const orderedKeys = [
    ...videoOrder.filter((key) => videoMap.has(key)),
    ...Array.from(videoMap.keys()).filter((key) => !videoOrder.includes(key)),
  ];

  return orderedKeys.map((key, index) => {
    const video = videoMap.get(key);
    return {
      url: video.url,
      publicId: video.publicId,
      thumbnailUrl: video.thumbnailUrl || "",
      duration: Number(video.duration || 0),
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

  const imageFiles = getUploadedFiles(req, "images");
  const videoFiles = getUploadedFiles(req, "videos");
  if (imageFiles.length < 3) {
    return sendResponse(res, 400, false, "At least three property images are required.");
  }

  apartmentData.coupons = apartmentData.coupons.map((coupon) => ({
    ...coupon,
    usedCount: 0,
  }));

  if (imageFiles.length > 10) {
    return sendResponse(res, 400, false, "Maximum ten property images are allowed.");
  }
  if (videoFiles.length > 5) {
    return sendResponse(res, 400, false, "Maximum five property videos are allowed.");
  }

  const uploadedImages = await uploadNewMedia({
    files: imageFiles,
    keys: apartmentData.newImageKeys,
    resourceType: "image",
    folder: "hydewest/apartments/images",
  });

  let uploadedVideos = [];
  try {
    uploadedVideos = await uploadNewMedia({
      files: videoFiles,
      keys: apartmentData.newVideoKeys,
      resourceType: "video",
      folder: "hydewest/apartments/videos",
    });
  } catch (error) {
    await cleanupUploadedMedia(uploadedImages, "image");
    throw error;
  }

  const images = arrangeImages({
    existingImages: [],
    uploadedImages,
    imageOrder: apartmentData.imageOrder,
    coverImageKey: apartmentData.coverImageKey,
  });
  const videos = arrangeVideos({
    existingVideos: [],
    uploadedVideos,
    videoOrder: apartmentData.videoOrder,
  });

  const slug = await generateUniqueSlug(apartmentData.title);
  let apartment;

  try {
    apartment = await Apartment.create({
      ...apartmentData,
      existingImages: undefined,
      newImageKeys: undefined,
      imageOrder: undefined,
      coverImageKey: undefined,
      existingVideos: undefined,
      newVideoKeys: undefined,
      videoOrder: undefined,
      slug,
      host: hostId,
      images,
      videos,
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
  } catch (error) {
    await Promise.all([
      cleanupUploadedMedia(uploadedImages, "image"),
      cleanupUploadedMedia(uploadedVideos, "video"),
    ]);
    throw error;
  }

  await User.updateOne(
    { _id: hostId },
    { $set: { freeListingCount: await Apartment.countDocuments({ host: hostId, isDeleted: false }) } }
  );

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
  const apartmentDocuments = await Apartment.find({
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  })
    .populate("host", "name email avatar")
    .sort({ createdAt: -1 });

  return sendResponse(
    res,
    200,
    true,
    "Apartments fetched successfully.",
    apartmentDocuments
  );
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

  return sendResponse(
    res,
    200,
    true,
    "Apartment details fetched successfully.",
    apartment
  );
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
  const retainedVideoPublicIds = new Set(
    apartmentData.existingVideos.map((video) => video.publicId).filter(Boolean)
  );
  const removedVideos = (apartment.videos || []).filter(
    (video) => video.publicId && !retainedVideoPublicIds.has(video.publicId)
  );

  const imageFiles = getUploadedFiles(req, "images");
  const videoFiles = getUploadedFiles(req, "videos");
  const uploadedImages = await uploadNewMedia({
    files: imageFiles,
    keys: apartmentData.newImageKeys,
    resourceType: "image",
    folder: "hydewest/apartments/images",
  });

  let uploadedVideos = [];
  try {
    uploadedVideos = await uploadNewMedia({
      files: videoFiles,
      keys: apartmentData.newVideoKeys,
      resourceType: "video",
      folder: "hydewest/apartments/videos",
    });
  } catch (error) {
    await cleanupUploadedMedia(uploadedImages, "image");
    throw error;
  }

  const images = arrangeImages({
    existingImages: apartmentData.existingImages,
    uploadedImages,
    imageOrder: apartmentData.imageOrder,
    coverImageKey: apartmentData.coverImageKey,
  });
  const videos = arrangeVideos({
    existingVideos: apartmentData.existingVideos,
    uploadedVideos,
    videoOrder: apartmentData.videoOrder,
  });

  if (images.length < 3 || images.length > 10 || videos.length > 5) {
    await Promise.all([
      cleanupUploadedMedia(uploadedImages, "image"),
      cleanupUploadedMedia(uploadedVideos, "video"),
    ]);

    if (images.length < 3) {
      return sendResponse(res, 400, false, "At least three property images must remain.");
    }
    if (images.length > 10) {
      return sendResponse(res, 400, false, "Maximum ten property images are allowed.");
    }
    return sendResponse(res, 400, false, "Maximum five property videos are allowed.");
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
    "guestCapacity",
    "bedrooms",
    "beds",
    "bedDetails",
    "maximumSleepingCapacity",
    "bathrooms",
    "bathroomDetails",
    "location",
    "propertyStyle",
    "nearbyInformation",
    "applianceGuide",
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
  apartment.videos = videos;

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

  try {
    await apartment.save();
  } catch (error) {
    await Promise.all([
      cleanupUploadedMedia(uploadedImages, "image"),
      cleanupUploadedMedia(uploadedVideos, "video"),
    ]);
    throw error;
  }

  await Promise.all([
    ...removedImages.map((image) => deleteFromCloudinary(image.publicId, "image")),
    ...removedVideos.map((video) => deleteFromCloudinary(video.publicId, "video")),
  ]);

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
  const hostId = req.user._id;
  const removedAt = new Date();
  const apartment = await Apartment.findOneAndUpdate(
    {
      _id: req.params.id,
      host: hostId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        status: APARTMENT_STATUS.INACTIVE,
        isFeatured: false,
        "moderation.removedAt": removedAt,
        "moderation.removedBy": hostId,
        "moderation.removalReason": "Removed by host.",
      },
      $push: {
        statusHistory: {
          status: APARTMENT_STATUS.INACTIVE,
          changedBy: hostId,
          changedAt: removedAt,
          action: "removed_by_host",
          reason: "Host removed the listing.",
        },
      },
    },
    { new: true }
  );

  if (!apartment) return sendResponse(res, 404, false, "Apartment not found.");

  const freeListingCount = await Apartment.countDocuments({
    host: hostId,
    isDeleted: false,
  });
  await User.updateOne({ _id: hostId }, { $set: { freeListingCount } });

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
      { "location.area": matcher },
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