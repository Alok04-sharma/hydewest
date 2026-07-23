const mongoose = require("mongoose");

const guestMembershipSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    planCode: { type: String, default: "premium" },
    status: { type: String, enum: ["inactive", "pending", "active", "expired", "cancelled"], default: "inactive", index: true },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null, index: true },
    benefits: { type: [String], default: ["host_chat", "discounted_booking", "priority_booking"] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuestMembership", guestMembershipSchema);