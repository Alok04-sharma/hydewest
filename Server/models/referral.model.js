const mongoose = require("mongoose");

const conversionSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["registered", "rewarded"],
      default: "registered",
    },
    rewardPoints: {
      type: Number,
      min: 0,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const referralSchema = new mongoose.Schema(
  {
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    clicks: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
    conversions: {
      type: [conversionSchema],
      default: [],
    },
    totalRewardPoints: {
      type: Number,
      min: 0,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);