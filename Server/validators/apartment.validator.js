const Joi = require("joi");

// ======================================
// Create Apartment Validation
// ======================================

const createApartmentSchema = Joi.object({
  // Basic Info
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
      "Guest House"
    )
    .required(),

  guests: Joi.number().integer().min(1).required(),

  bedrooms: Joi.number().integer().min(1).required(),

  beds: Joi.number().integer().min(1).required(),

  bathrooms: Joi.number().integer().min(1).required(),

  // Location
  country: Joi.string().required(),

  state: Joi.string().required(),

  city: Joi.string().required(),

  address: Joi.string().required(),

  zipCode: Joi.string().allow("").optional(),

  latitude: Joi.number().required(),

  longitude: Joi.number().required(),

  // Pricing
  pricePerNight: Joi.number().min(1).required(),

  cleaningFee: Joi.number().min(0).default(0),

  serviceFee: Joi.number().min(0).default(0),

  currency: Joi.string().default("INR"),

  // Amenities
  amenities: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string()
    )
    .optional(),

  // Availability
  availableFrom: Joi.date().required(),

  availableTo: Joi.date()
    .greater(Joi.ref("availableFrom"))
    .required(),

  // Policies
  minBookingDays: Joi.number().min(1).default(1),

  maxBookingDays: Joi.number().min(1).default(365),

  cancellationPolicy: Joi.string()
    .valid(
      "flexible",
      "moderate",
      "strict"
    )
    .default("moderate"),

  // Timezone
  timezone: Joi.string().default("UTC"),
});

module.exports = {
  createApartmentSchema,
};