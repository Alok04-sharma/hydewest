const mongoose = require("mongoose");
const { LOYALTY_TRANSACTION_TYPE } = require("../constants/loyalty");

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "LoyaltyAccount", required: true, index: true },
    type: { type: String, enum: Object.values(LOYALTY_TRANSACTION_TYPE), required: true, index: true },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    points: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true, min: 0 },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    referenceKey: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "", trim: true },
    expiresAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ guest: 1, createdAt: -1 });

module.exports = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);