const mongoose = require("mongoose");

const loyaltyAccountSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    lifetimeEarned: { type: Number, default: 0, min: 0 },
    lifetimeRedeemed: { type: Number, default: 0, min: 0 },
    lifetimeReversed: { type: Number, default: 0, min: 0 },
    tier: { type: String, enum: ["explorer", "traveler", "elite"], default: "explorer" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoyaltyAccount", loyaltyAccountSchema);