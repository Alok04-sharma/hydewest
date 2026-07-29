const mongoose = require("mongoose");

const APARTMENT_STATUS = require("../constants/apartmentStatus");
const CANCELLATION_POLICY = require("../constants/cancellationPolicy");
const PRICING_UNIT = require("../constants/pricingUnit");
const { generateRatesFromDailyPrice } = require("../constants/pricingPresets");

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

const videoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: "", trim: true },
    duration: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const bedDetailSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["King", "Queen", "Single", "Twin", "Bunk", "Sofa Bed"],
      required: true,
    },
    count: { type: Number, default: 1, min: 1, max: 30 },
    capacityPerBed: { type: Number, default: 1, min: 1, max: 4 },
  },
  { _id: true }
);

const applianceGuideSchema = new mongoose.Schema(
  {
    appliance: { type: String, required: true, trim: true, maxlength: 80 },
    instructions: { type: String, required: true, trim: true, maxlength: 1200 },
  },
  { _id: true }
);

const specialPriceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    price: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, default: "", maxlength: 120 },
  },
  { _id: true }
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
    premiumOnly: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 240,
    },
    paymentMethod: {
      type: String,
      enum: ["any", "upi", "card"],
      default: "any",
    },
    source: {
      type: String,
      enum: ["preset", "custom"],
      default: "custom",
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

    guestCapacity: {
      adults: { type: Number, default: 2, min: 1, max: 50 },
      children: { type: Number, default: 0, min: 0, max: 30 },
      seniorCitizens: { type: Number, default: 0, min: 0, max: 30 },
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

    bedDetails: {
      type: [bedDetailSchema],
      default: [],
    },

    maximumSleepingCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    bathrooms: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    bathroomDetails: {
      western: { type: Number, default: 0, min: 0 },
      indian: { type: Number, default: 0, min: 0 },
      shower: { type: Number, default: 0, min: 0 },
      bathtub: { type: Number, default: 0, min: 0 },
      hotWater: { type: Boolean, default: false },
      accessible: { type: Boolean, default: false },
      sunflowerFriendly: { type: Boolean, default: false },
      notes: { type: String, trim: true, default: "", maxlength: 500 },
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
      area: {
        type: String,
        trim: true,
        default: "",
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
        default: null,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        default: null,
        min: -180,
        max: 180,
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

    videos: {
      type: [videoSchema],
      default: [],
    },

    nearbyInformation: {
      nearestAirport: { type: String, trim: true, default: "" },
      railwayStation: { type: String, trim: true, default: "" },
      busStand: { type: String, trim: true, default: "" },
      metro: { type: String, trim: true, default: "" },
      nearbyMarket: { type: String, trim: true, default: "" },
      groceryStore: { type: String, trim: true, default: "" },
      hospital: { type: String, trim: true, default: "" },
      medicalStore: { type: String, trim: true, default: "" },
      parking: { type: String, trim: true, default: "" },
      internet: { type: String, trim: true, default: "" },
      powerBackup: { type: String, trim: true, default: "" },
      otherFacilities: { type: [String], default: [] },
    },

    applianceGuide: {
      type: [applianceGuideSchema],
      default: [],
    },

    propertyStyle: {
      type: String,
      trim: true,
      default: "Modern",
      maxlength: 80,
    },

    pricing: {
      // The hidden daily reference keeps legacy smart-rate calculations stable.
      // Guests only see Hour, Night, Week and Month as booking options.
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
      // Legacy compatibility. This mirrors pricing.rates.night.
      pricePerNight: {
        type: Number,
        required: true,
        min: 1,
      },
      rates: {
        hour: { type: Number, required: true, min: 0 },
        night: { type: Number, required: true, min: 1 },
        day: { type: Number, required: true, min: 1 },
        week: { type: Number, required: true, min: 1 },
        month: { type: Number, required: true, min: 1 },
      },
      autoRateMultipliers: {
        type: Boolean,
        default: true,
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
      unavailableDates: [
        {
          type: Date,
        },
      ],
      specialPrices: {
        type: [specialPriceSchema],
        default: [],
      },
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

    premium: {
      isExclusive: {
        type: Boolean,
        default: false,
        index: true,
      },
      discountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 80,
      },
      earlyAccessHours: {
        type: Number,
        default: 0,
        min: 0,
        max: 168,
      },
      hiddenOfferLabel: {
        type: String,
        default: "",
        trim: true,
      },
    },

    features: {
      instantBook: { type: Boolean, default: false, index: true },
      selfCheckIn: { type: Boolean, default: false, index: true },
      petFriendly: { type: Boolean, default: false, index: true },
      superLuxury: { type: Boolean, default: false, index: true },
    },

    priceHistory: {
      type: [
        {
          amount: { type: Number, required: true, min: 0 },
          priceUnit: { type: String, default: PRICING_UNIT.NIGHT },
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    aiPriceSuggestions: {
      type: [
        {
          currentPrice: { type: Number, required: true, min: 1 },
          suggestedPrice: { type: Number, required: true, min: 1 },
          reason: { type: String, required: true, trim: true, maxlength: 500 },
          context: { type: mongoose.Schema.Types.Mixed, default: {} },
          status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true },
          createdAt: { type: Date, default: Date.now },
          resolvedAt: { type: Date, default: null },
        },
      ],
      default: [],
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
  if (Array.isArray(this.bedDetails) && this.bedDetails.length > 0) {
    this.beds = this.bedDetails.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );
    this.maximumSleepingCapacity = this.bedDetails.reduce(
      (sum, item) =>
        sum + Number(item.count || 0) * Number(item.capacityPerBed || 1),
      0
    );
  }

  if (this.guestCapacity) {
    const totalGuests =
      Number(this.guestCapacity.adults || 0) +
      Number(this.guestCapacity.children || 0) +
      Number(this.guestCapacity.seniorCitizens || 0);
    if (totalGuests > 0) this.guests = totalGuests;
  }

  if (this.pricing) {
    const dailyPrice = Number(
      this.pricing.rates?.day ||
        this.pricing.basePrice ||
        this.pricing.pricePerNight ||
        0
    );
    const rates = generateRatesFromDailyPrice(dailyPrice, this.pricing.rates || {});

    this.pricing.basePrice = rates.night;
    this.pricing.pricePerNight = rates.night;
    this.pricing.priceUnit = PRICING_UNIT.NIGHT;
    if (Number(this.policies?.minBookingDays || 1) > 1) {
      rates.hour = 0;
    }

    this.pricing.rates = rates;
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
  "location.area": 1,
});
apartmentSchema.index({ "pricing.basePrice": 1 });
apartmentSchema.index({ "pricing.rates.hour": 1, "pricing.rates.night": 1, "pricing.rates.week": 1, "pricing.rates.month": 1 });
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