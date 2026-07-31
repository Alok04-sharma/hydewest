const mongoose = require("mongoose");

const BOOKING_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

const bookingHistorySchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, required: true },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: undefined },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: undefined },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const bookingSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment", required: true, index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guestsCount: { type: Number, required: true, min: 1, default: 1 },
    totalAmount: { type: Number, default: 0, min: 0 },
    hostShare: { type: Number, default: 0, min: 0 },
    adminShare: { type: Number, default: 0, min: 0 },
    revenueType: {
      type: String,
      enum: ["free_host_commission", "subscribed_host_commission"],
      default: "free_host_commission",
      index: true,
    },
    // Legacy field name retained for backward compatibility. The stored value
    // is the platform/admin commission percentage (30 for Free, 10 for subscribed).
    hostCommissionPercentage: { type: Number, default: 30, min: 0, max: 100 },
    pricing: {
      basePrice: { type: Number, default: 0 },
      priceUnit: { type: String, default: "night" },
      bookingUnit: { type: String, default: "night" },
      unitCount: { type: Number, default: 1 },
      durationHours: { type: Number, default: 0 },
      pricePerNight: { type: Number, default: 0 },
      totalNights: { type: Number, default: 1 },
      availableRates: { type: mongoose.Schema.Types.Mixed, default: {} },
      unitSavingsPercent: { type: Number, default: 0 },
      subtotal: { type: Number, required: true },
      includedGuests: { type: Number, default: 1 },
      extraGuestCount: { type: Number, default: 0 },
      extraGuestFee: { type: Number, default: 0 },
      extraGuestCharge: { type: Number, default: 0 },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      couponCode: { type: String, default: "", uppercase: true, trim: true },
      couponLabel: { type: String, default: "" },
      couponPaymentMethod: { type: String, default: "any" },
      preferredPaymentMethod: { type: String, default: "any" },
      paymentMethodMismatch: { type: Boolean, default: false },
      discountAmount: { type: Number, default: 0 },
      premiumDiscountAmount: { type: Number, default: 0 },
      loyaltyPointsUsed: { type: Number, default: 0, min: 0 },
      loyaltyDiscountAmount: { type: Number, default: 0, min: 0 },
      totalAmount: { type: Number, required: true },
      hostPayableAmount: { type: Number, default: 0 },
      platformDiscountAmount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },
    membershipSnapshot: {
      isPremium: { type: Boolean, default: false },
      planCode: { type: String, default: "" },
      discountPercent: { type: Number, default: 0 },
      benefits: { type: [String], default: [] },
    },
    loyalty: {
      expectedPoints: { type: Number, default: 0, min: 0 },
      awardedPoints: { type: Number, default: 0, min: 0 },
      rewardRecorded: { type: Boolean, default: false },
      redemptionRecorded: { type: Boolean, default: false },
      reversalRecorded: { type: Boolean, default: false },
    },
    insurance: {
      enabled: { type: Boolean, default: false },
      premiumAmount: { type: Number, default: 0, min: 0 },
      coverageType: { type: String, default: "" },
    },
    couponUsageRecorded: { type: Boolean, default: false },
    paymentFinalization: {
      gatewayPaymentId: { type: String, default: "", trim: true },
      finalizedAt: { type: Date, default: null },
      apartmentCountSyncedAt: { type: Date, default: null },
      couponCountSyncedAt: { type: Date, default: null },
    },
    priorityScore: { type: Number, default: 0, index: true },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.PENDING, index: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },
    hostDecisionAt: { type: Date, default: null },
    cancellation: {
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      cancelledAt: { type: Date, default: null },
      reason: { type: String, trim: true, default: "" },
      refundEligible: { type: Boolean, default: false },
      cancellationWindowHours: { type: Number, default: 24 },
    },
    reminders: {
      hostCheckInSentAt: { type: Date, default: null },
      hostCheckOutSentAt: { type: Date, default: null },
      guestCheckInSentAt: { type: Date, default: null },
      guestCheckOutSentAt: { type: Date, default: null },
      roomAvailableSentAt: { type: Date, default: null },
      guestCompletedSentAt: { type: Date, default: null },
    },

    purpose: {
      category: {
        type: String,
        enum: ["leisure", "business", "family_visit", "other"],
        default: "other",
        index: true,
      },
      details: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },
    },
    message: { type: String, trim: true, maxlength: 500, default: "" },
    history: { type: [bookingHistorySchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

bookingSchema.pre("save", function validateDates() {
  if (this.checkOut <= this.checkIn) {
    throw new Error("Check-out date must be after check-in date.");
  }
});

bookingSchema.index({ apartment: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ host: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.BOOKING_STATUS = BOOKING_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;