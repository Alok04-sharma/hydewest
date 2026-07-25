const mongoose = require("mongoose");

const guestMembershipSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    planCode: { type: String, default: "", trim: true, index: true },
    planName: { type: String, default: "", trim: true },
    durationMonths: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    status: {
      type: String,
      enum: ["inactive", "pending", "active", "expired", "cancelled", "failed"],
      default: "inactive",
      index: true,
    },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null, index: true },
    nextRenewalDate: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    benefits: { type: [String], default: [] },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    loyaltyMultiplier: { type: Number, default: 1, min: 1 },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestMembershipPayment",
      default: null,
    },
    reminderSentAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

guestMembershipSchema.index({ guest: 1, status: 1, expiryDate: -1 });

module.exports = mongoose.model("GuestMembership", guestMembershipSchema);