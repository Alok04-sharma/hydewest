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
    pricing: {
      basePrice: { type: Number, default: 0 },
      priceUnit: { type: String, default: "night" },
      unitCount: { type: Number, default: 1 },
      pricePerNight: { type: Number, default: 0 },
      totalNights: { type: Number, default: 1 },
      subtotal: { type: Number, required: true },
      includedGuests: { type: Number, default: 1 },
      extraGuestCount: { type: Number, default: 0 },
      extraGuestFee: { type: Number, default: 0 },
      extraGuestCharge: { type: Number, default: 0 },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      couponCode: { type: String, default: "", uppercase: true, trim: true },
      discountAmount: { type: Number, default: 0 },
      premiumDiscountAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      currency: { type: String, default: "INR" },
    },
    couponUsageRecorded: { type: Boolean, default: false },
    priorityScore: { type: Number, default: 0, index: true },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.PENDING, index: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },
    hostDecisionAt: { type: Date, default: null },
    cancellation: {
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      cancelledAt: Date,
      reason: { type: String, trim: true },
    },
    reminders: {
      checkInSentAt: { type: Date, default: null },
      checkOutSentAt: { type: Date, default: null },
      roomAvailableSentAt: { type: Date, default: null },
    },
    message: { type: String, trim: true, maxlength: 500 },
    history: { type: [bookingHistorySchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

bookingSchema.pre("save", function validateDates(next) {
  if (this.checkOut <= this.checkIn) return next(new Error("Check-out date must be after check-in date."));
  return next();
});

bookingSchema.index({ apartment: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ host: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
module.exports = mongoose.model("Booking", bookingSchema);
module.exports.BOOKING_STATUS = BOOKING_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;