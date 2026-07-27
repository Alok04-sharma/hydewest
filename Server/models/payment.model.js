const mongoose = require("mongoose");

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
});

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String, default: "", index: true },
    razorpaySignature: { type: String, default: "" },
    invoiceNumber: { type: String, default: "", trim: true, index: true },
    invoiceGeneratedAt: { type: Date, default: null },
    amount: { type: Number, required: true },
    totalAmount: { type: Number, default: 0, min: 0 },
    hostShare: { type: Number, default: 0, min: 0 },
    adminShare: { type: Number, default: 0, min: 0 },
    revenueType: {
      type: String,
      enum: ["free_host_commission", "subscribed_host_commission"],
      default: "free_host_commission",
    },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    loyaltyProcessedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ booking: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;