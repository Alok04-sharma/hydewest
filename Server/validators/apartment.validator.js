const Joi = require("joi");

const couponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(30).required(),
  discountType: Joi.string().valid("percentage", "fixed").required(),
  discountValue: Joi.number().positive().required(),
  minBookingAmount: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).default(0),
  validFrom: Joi.date().required(),
  validUntil: Joi.date().greater(Joi.ref("validFrom")).allow(null),
  usageLimit: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

const createApartmentSchema = Joi.object({
  title: Joi.string().min(10).max(100).required(),
  description: Joi.string().min(50).max(3000).required(),
  propertyType: Joi.string()
    .valid(
      "Apartment",
      "House",
      "Villa",
      "Cabin",
      "Farm House",
      "Hotel",
      "Resort",
      "Hostel",
      "Guest House",
      "Studio",
      "Room",
      "Cottage",
      "Tree House",
      "Tent"
    )
    .required(),
  guests: Joi.number().integer().min(1).required(),
  bedrooms: Joi.number().integer().min(0).required(),
  beds: Joi.number().integer().min(1).required(),
  bathrooms: Joi.number().min(1).required(),
  location: Joi.object({
    country: Joi.string().required(),
    state: Joi.string().required(),
    city: Joi.string().required(),
    address: Joi.string().required(),
    landmark: Joi.string().allow("").default(""),
    zipCode: Joi.string().allow("").default(""),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  pricing: Joi.object({
    basePrice: Joi.number().positive().required(),
    priceUnit: Joi.string().valid("hour", "day", "night", "week", "month").required(),
    cleaningFee: Joi.number().min(0).default(0),
    serviceFee: Joi.number().min(0).default(0),
    extraGuestFee: Joi.number().min(0).default(0),
    baseGuestCount: Joi.number().integer().min(1).required(),
    currency: Joi.string().default("INR"),
  }).required(),
  coupons: Joi.array().items(couponSchema).default([]),
  amenities: Joi.array().items(Joi.string()).default([]),
  houseRules: Joi.array().items(Joi.string()).default([]),
  availability: Joi.object({
    availableFrom: Joi.date().required(),
    availableTo: Joi.date().greater(Joi.ref("availableFrom")).required(),
    blockedDates: Joi.array().items(Joi.date()).default([]),
  }).required(),
  policies: Joi.object({
    minBookingDays: Joi.number().integer().min(1).default(1),
    maxBookingDays: Joi.number().integer().min(1).default(365),
    cancellationPolicy: Joi.string().valid("flexible", "moderate", "strict").default("moderate"),
    checkInTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    checkOutTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  }).required(),
  timezone: Joi.string().default("Asia/Kolkata"),
});

module.exports = {
  createApartmentSchema,
};