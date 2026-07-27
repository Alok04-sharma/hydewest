const mongoose = require("mongoose");
const { REVENUE_TYPE } = require("../constants/revenue");

const revenueSchema = new mongoose.Schema(
  {
    revenueType: {
      type: String,
      enum: Object.values(REVENUE_TYPE),
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    grossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    hostShare: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminShare: {
      type: Number,
      default: 0,
      min: 0,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    subscriptionPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPayment",
      default: null,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    area: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    sourceKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

revenueSchema.index({ revenueType: 1, date: -1 });
revenueSchema.index({ host: 1, date: -1 });
revenueSchema.index({ city: 1, area: 1, date: -1 });

module.exports = mongoose.model("Revenue", revenueSchema);