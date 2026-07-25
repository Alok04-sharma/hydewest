const mongoose = require("mongoose");

const priceAlertSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment", required: true, index: true },
    targetPrice: { type: Number, default: 0, min: 0 },
    lastSeenPrice: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    lastNotifiedAt: { type: Date, default: null },
    lastNotifiedPrice: { type: Number, default: null, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

priceAlertSchema.index({ guest: 1, apartment: 1 }, { unique: true });

module.exports = mongoose.model("PriceAlert", priceAlertSchema);