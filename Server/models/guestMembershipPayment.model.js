const mongoose = require("mongoose");

const GUEST_PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
});

const guestMembershipPaymentSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestMembership",
      required: true,
      index: true,
    },
    planCode: { type: String, required: true, trim: true, index: true },
    planName: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    razorpayOrderId: { type: String, required: true, trim: true },
    razorpayPaymentId: { type: String, default: "", trim: true },
    razorpaySignature: { type: String, default: "", select: false },
    invoiceNumber: { type: String, default: "", trim: true, index: true },
    invoiceGeneratedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(GUEST_PAYMENT_STATUS),
      default: GUEST_PAYMENT_STATUS.PENDING,
      index: true,
    },
    processingStartedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: "", trim: true, maxlength: 500 },
    coverageStart: { type: Date, default: null },
    coverageEnd: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

guestMembershipPaymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
guestMembershipPaymentSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpayPaymentId: { $type: "string", $gt: "" } },
  }
);
guestMembershipPaymentSchema.index({ guest: 1, createdAt: -1 });

module.exports = mongoose.model(
  "GuestMembershipPayment",
  guestMembershipPaymentSchema
);
module.exports.GUEST_PAYMENT_STATUS = GUEST_PAYMENT_STATUS;