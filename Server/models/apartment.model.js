const mongoose = require("mongoose");

const APARTMENT_STATUS = require("../constants/apartmentStatus");
const CANCELLATION_POLICY = require("../constants/cancellationPolicy");
const PRICING_UNIT = require("../constants/pricingUnit");

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    isCover: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    minBookingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const listingHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(APARTMENT_STATUS),
      required: true,
    },
    action: {
      type: String,
      trim: true,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const moderationSchema = new mongoose.Schema(
  {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: "",
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    removalReason: {
      type: String,
      trim: true,
      default: "",
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const apartmentSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 50,
      maxlength: 3000,
    },

    propertyType: {
      type: String,
      required: true,
      enum: [
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
        "Tent",
      ],
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    bedrooms: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },

    beds: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    bathrooms: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    location: {
      country: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
        default: "",
      },
      zipCode: {
        type: String,
        trim: true,
        default: "",
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },

    images: {
      type: [imageSchema],
      validate: {
        validator(value) {
          if (!this.isNew) {
            return true;
          }

          return Array.isArray(value) && value.length >= 3;
        },
        message: "At least three property images are required.",
      },
    },

    pricing: {
      basePrice: {
        type: Number,
        required: true,
        min: 1,
      },
      priceUnit: {
        type: String,
        enum: Object.values(PRICING_UNIT),
        default: PRICING_UNIT.NIGHT,
      },
      // Legacy compatibility for old cards and records.
      pricePerNight: {
        type: Number,
        required: true,
        min: 1,
      },
      cleaningFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      serviceFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      extraGuestFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      baseGuestCount: {
        type: Number,
        default: 1,
        min: 1,
      },
      currency: {
        type: String,
        default: "INR",
        uppercase: true,
      },
    },

    coupons: {
      type: [couponSchema],
      default: [],
    },

    amenities: [
      {
        type: String,
        trim: true,
      },
    ],

    houseRules: [
      {
        type: String,
        trim: true,
      },
    ],

    availability: {
      availableFrom: {
        type: Date,
        required: true,
      },
      availableTo: {
        type: Date,
        required: true,
      },
      blockedDates: [
        {
          type: Date,
        },
      ],
    },

    policies: {
      minBookingDays: {
        type: Number,
        default: 1,
        min: 1,
      },
      maxBookingDays: {
        type: Number,
        default: 365,
        min: 1,
      },
      cancellationPolicy: {
        type: String,
        enum: Object.values(CANCELLATION_POLICY),
        default: CANCELLATION_POLICY.MODERATE,
      },
      checkInTime: {
        type: String,
        default: "14:00",
        trim: true,
      },
      checkOutTime: {
        type: String,
        default: "11:00",
        trim: true,
      },
    },

    timezone: {
      type: String,
      required: true,
      default: "Asia/Kolkata",
    },

    status: {
      type: String,
      enum: Object.values(APARTMENT_STATUS),
      default: APARTMENT_STATUS.DRAFT,
      index: true,
    },

    moderation: {
      type: moderationSchema,
      default: () => ({}),
    },

    statusHistory: {
      type: [listingHistorySchema],
      default: [],
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    bookingCount: {
      type: Number,
      default: 0,
    },

    wishlistCount: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

apartmentSchema.pre("validate", function normalizeListing() {
  if (this.pricing) {
    const basePrice = Number(
      this.pricing.basePrice || this.pricing.pricePerNight || 0
    );

    this.pricing.basePrice = basePrice;
    this.pricing.pricePerNight = basePrice;
  }

  if (Array.isArray(this.images) && this.images.length > 0) {
    let coverIndex = this.images.findIndex(
      (image) => image.isCover
    );

    if (coverIndex < 0) {
      coverIndex = 0;
    }

    this.images = this.images
      .map((image, index) => ({
        url: image.url,
        publicId: image.publicId,
        isCover: index === coverIndex,
        order: index,
      }))
      .sort((firstImage, secondImage) => {
        if (firstImage.isCover) {
          return -1;
        }

        if (secondImage.isCover) {
          return 1;
        }

        return firstImage.order - secondImage.order;
      })
      .map((image, index) => ({
        ...image,
        order: index,
      }));
  }

  if (Array.isArray(this.coupons)) {
    const seenCouponCodes = new Set();

    this.coupons = this.coupons.filter((coupon) => {
      const code = String(coupon.code || "")
        .trim()
        .toUpperCase();

      if (!code || seenCouponCodes.has(code)) {
        return false;
      }

      seenCouponCodes.add(code);
      coupon.code = code;

      return true;
    });
  }
});

apartmentSchema.index({
  "location.country": 1,
  "location.state": 1,
  "location.city": 1,
});
apartmentSchema.index({ "pricing.basePrice": 1 });
apartmentSchema.index({ host: 1, createdAt: -1 });
apartmentSchema.index({ status: 1, isDeleted: 1, createdAt: -1 });
apartmentSchema.index({ isFeatured: 1 });
apartmentSchema.index({ "coupons.code": 1 });

apartmentSchema.index({
  title: "text",
  description: "text",
  "location.city": "text",
  "location.state": "text",
  "location.country": "text",
});

module.exports = mongoose.model("Apartment", apartmentSchema);