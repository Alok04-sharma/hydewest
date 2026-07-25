const mongoose = require("mongoose");

const guestMembershipPaymentSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: "GuestMembership", required: true, index: true },
    planCode: { type: String, required: true, trim: true, index: true },
    planName: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: "", index: true },
    razorpaySignature: { type: String, default: "" },
    invoiceNumber: { type: String, default: "", trim: true, index: true },
    invoiceGeneratedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: "", trim: true },
    coverageStart: { type: Date, default: null },
    coverageEnd: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

guestMembershipPaymentSchema.index({ guest: 1, createdAt: -1 });

module.exports = mongoose.model("GuestMembershipPayment", guestMembershipPaymentSchema);