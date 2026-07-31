const { z } = require("zod");

// ======================================
// Shared primitive validators
// ======================================

const objectIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-fA-F0-9]{24}$/,
    "Invalid resource identifier"
  );

const dateTimeSchema = z
  .string()
  .trim()
  .min(
    1,
    "Date and time are required"
  )
  .refine(
    (value) =>
      !Number.isNaN(
        Date.parse(value)
      ),
    "Invalid date and time"
  );

// ======================================
// Safe boolean validation
// ======================================

// z.coerce.boolean() mein "false" string bhi true ban sakti hai,
// kyunki non-empty string JavaScript mein truthy hoti hai.
//
// Ye validator safely accept karega:
// true
// false
// "true"
// "false"
// 1
// 0

const safeBooleanSchema =
  z.preprocess(
    (value) => {
      if (
        typeof value ===
        "boolean"
      ) {
        return value;
      }

      if (
        typeof value ===
        "string"
      ) {
        const normalizedValue =
          value
            .trim()
            .toLowerCase();

        if (
          normalizedValue ===
          "true"
        ) {
          return true;
        }

        if (
          normalizedValue ===
          "false"
        ) {
          return false;
        }
      }

      if (value === 1) {
        return true;
      }

      if (value === 0) {
        return false;
      }

      return value;
    },
    z.boolean()
  );

// ======================================
// Shared quote/pricing fields
// ======================================

const quoteFields = {
  checkIn:
    dateTimeSchema,

  checkOut:
    dateTimeSchema,

  guestsCount: z.coerce
    .number()
    .int()
    .min(
      1,
      "At least one guest is required"
    )
    .max(
      50,
      "Guest count is too high"
    )
    .default(1),

  bookingUnit: z
    .enum([
      "hour",
      "night",
      "day",
      "week",
      "month",
    ])
    .default("night"),

  unitCount: z.coerce
    .number()
    .int()
    .min(
      1,
      "Booking duration must be at least one unit"
    )
    .max(
      365,
      "Booking duration is too long"
    )
    .optional(),

  couponCode: z
    .string()
    .trim()
    .max(
      40,
      "Coupon code is too long"
    )
    .optional()
    .default(""),

  paymentMethod: z
    .enum([
      "any",
      "upi",
      "card",
    ])
    .optional()
    .default("any"),

  loyaltyPointsToRedeem:
    z.coerce
      .number()
      .int()
      .min(
        0,
        "Loyalty points cannot be negative"
      )
      .max(
        1000000,
        "Loyalty points value is too high"
      )
      .optional()
      .default(0),
};

// ======================================
// Booking metadata fields
// ======================================

// ListingDetails.jsx quote aur booking-create ke liye
// same payload builder use karta hai.
//
// In fields ka quote calculation par abhi direct effect nahi hai,
// lekin ye genuine booking-form fields hain.
//
// `.strict()` enabled hi rahega, isliye inke alawa koi unknown
// field request mein aayi to woh ab bhi reject hogi.

const bookingMetadataFields = {
  bookingInsurance:
    safeBooleanSchema
      .optional()
      .default(false),

  bookingPurpose: z
    .enum([
      "leisure",
      "business",
      "family_visit",
      "other",
    ])
    .optional(),

  bookingPurposeDetails:
    z.string()
      .trim()
      .max(
        300,
        "Booking purpose details cannot exceed 300 characters"
      )
      .optional()
      .default(""),

  message: z
    .string()
    .trim()
    .max(
      500,
      "Message cannot exceed 500 characters"
    )
    .optional()
    .default(""),
};

// ======================================
// Shared date validation
// ======================================

const validateBookingDates = (
  value,
  context
) => {
  const checkIn =
    new Date(
      value.checkIn
    );

  const checkOut =
    new Date(
      value.checkOut
    );

  if (
    checkOut <= checkIn
  ) {
    context.addIssue({
      code: "custom",
      path: [
        "checkOut",
      ],
      message:
        "Check-out must be after check-in.",
    });
  }
};

// ======================================
// Booking purpose validation
// ======================================

const validateBookingPurpose =
  (
    value,
    context
  ) => {
    if (
      value.bookingPurpose ===
        "other" &&
      String(
        value.bookingPurposeDetails ||
          ""
      ).trim().length < 3
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "bookingPurposeDetails",
        ],
        message:
          "Please briefly describe your booking purpose.",
      });
    }
  };

// ======================================
// POST /api/bookings/quote
// ======================================

// Quote request known booking metadata ko accept karegi,
// lekin price calculation sirf quoteFields ke basis par hi hogi.

const bookingQuoteSchema =
  z.object({
    apartmentId:
      objectIdSchema,

    ...quoteFields,

    ...bookingMetadataFields,
  })
    .strict()
    .superRefine(
      validateBookingDates
    );

// ======================================
// Listing-specific quote schema
// ======================================

// Apartment/listing quote endpoint booking metadata nahi bhejta,
// isliye ye schema pricing fields tak limited hai.

const listingQuoteSchema =
  z.object({
    ...quoteFields,
  })
    .strict()
    .superRefine(
      validateBookingDates
    );

// ======================================
// POST /api/bookings/create
// ======================================

const createBookingSchema =
  z.object({
    apartmentId:
      objectIdSchema,

    ...quoteFields,

    ...bookingMetadataFields,

    // Booking creation ke time purpose missing hua to
    // existing behavior preserve karne ke liye "other" set hoga.
    bookingPurpose: z
      .enum([
        "leisure",
        "business",
        "family_visit",
        "other",
      ])
      .default("other"),
  })
    .strict()
    .superRefine(
      (
        value,
        context
      ) => {
        validateBookingDates(
          value,
          context
        );

        validateBookingPurpose(
          value,
          context
        );
      }
    );

// ======================================
// PATCH /api/bookings/:id/cancel
// ======================================

const cancelBookingSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        3,
        "Cancellation reason is too short"
      )
      .max(
        500,
        "Cancellation reason cannot exceed 500 characters"
      )
      .optional()
      .default(
        "Cancelled by guest"
      ),
  })
    .strict();

// ======================================
// Exports
// ======================================

module.exports = {
  bookingQuoteSchema,
  listingQuoteSchema,
  createBookingSchema,
  cancelBookingSchema,
};