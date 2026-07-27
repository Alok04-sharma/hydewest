const Joi = require("joi");

const couponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(30).required(),
  discountType: Joi.string().valid("percentage", "fixed").required(),
  discountValue: Joi.number().positive().required(),
  minBookingAmount: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).default(0),
  validFrom: Joi.date().required(),
  validUntil: Joi.date().greater(Joi.ref("validFrom")).allow(null, ""),
  usageLimit: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  premiumOnly: Joi.boolean().default(false),
  paymentMethod: Joi.string().valid("any", "upi", "card").default("any"),
  label: Joi.string().allow("").max(80),
  description: Joi.string().allow("").max(240),
  source: Joi.string().valid("preset", "custom").default("custom"),
}).unknown(true);

const createApartmentSchema = Joi.object({
  title: Joi.string().min(10).max(100).required(),
  description: Joi.string().min(50).max(3000).required(),
  propertyType: Joi.string().required(),
  propertyStyle: Joi.string().allow("").max(80),
  guests: Joi.number().integer().min(1).required(),
  guestCapacity: Joi.object({
    adults: Joi.number().integer().min(1).required(),
    children: Joi.number().integer().min(0).default(0),
    seniorCitizens: Joi.number().integer().min(0).default(0),
  }),
  bedrooms: Joi.number().integer().min(0).required(),
  beds: Joi.number().integer().min(1).required(),
  bedDetails: Joi.array().items(
    Joi.object({
      type: Joi.string().valid("King", "Queen", "Single", "Twin", "Bunk", "Sofa Bed").required(),
      count: Joi.number().integer().min(1).required(),
      capacityPerBed: Joi.number().integer().min(1).max(4).required(),
    })
  ),
  bathrooms: Joi.number().min(1).required(),
  bathroomDetails: Joi.object().unknown(true),
  location: Joi.object({
    country: Joi.string().required(),
    state: Joi.string().required(),
    city: Joi.string().required(),
    area: Joi.string().allow("").default(""),
    address: Joi.string().required(),
    landmark: Joi.string().allow("").default(""),
    zipCode: Joi.string().allow("").default(""),
    latitude: Joi.number().min(-90).max(90).allow(null, ""),
    longitude: Joi.number().min(-180).max(180).allow(null, ""),
  }).required(),
  nearbyInformation: Joi.object().unknown(true),
  applianceGuide: Joi.array().items(
    Joi.object({
      appliance: Joi.string().max(80).required(),
      instructions: Joi.string().max(1200).required(),
    })
  ),
  pricing: Joi.object({
    basePrice: Joi.number().positive().required(),
    priceUnit: Joi.string().valid("hour", "day", "night", "week", "month").required(),
    pricePerNight: Joi.number().min(0),
    rates: Joi.object({
      hour: Joi.number().min(0).required(),
      night: Joi.number().positive().required(),
      day: Joi.number().positive().required(),
      week: Joi.number().positive().required(),
      month: Joi.number().positive().required(),
    }),
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
    unavailableDates: Joi.array().items(Joi.date()).default([]),
    specialPrices: Joi.array().items(
      Joi.object({
        date: Joi.date().required(),
        price: Joi.number().positive().required(),
        note: Joi.string().allow("").max(120),
      })
    ),
  }).required(),
  policies: Joi.object({
    minBookingDays: Joi.number().integer().min(1).default(1),
    maxBookingDays: Joi.number().integer().min(1).default(365),
    cancellationPolicy: Joi.string().valid("flexible", "moderate", "strict").default("moderate"),
    checkInTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    checkOutTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  }).required(),
  timezone: Joi.string().default("Asia/Kolkata"),
}).unknown(true);

module.exports = { createApartmentSchema };