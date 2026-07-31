const mongoose = require("mongoose");

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
});

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    razorpayOrderId: { type: String, required: true, trim: true },
    razorpayPaymentId: { type: String, default: "", trim: true },
    razorpaySignature: { type: String, default: "", select: false },
    invoiceNumber: { type: String, default: "", trim: true, index: true },
    invoiceGeneratedAt: { type: Date, default: null },
    amount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    hostShare: { type: Number, default: 0, min: 0 },
    adminShare: { type: Number, default: 0, min: 0 },
    revenueType: {
      type: String,
      enum: ["free_host_commission", "subscribed_host_commission"],
      default: "free_host_commission",
    },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    processingStartedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: "", trim: true, maxlength: 500 },
    refundedAt: { type: Date, default: null },
    loyaltyProcessedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpayPaymentId: { $type: "string", $gt: "" } },
  }
);
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ booking: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;