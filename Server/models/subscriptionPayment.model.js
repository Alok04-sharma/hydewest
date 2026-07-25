const mongoose = require("mongoose");

const {
  SUBSCRIPTION_PAYMENT_STATUS,
} = require("../constants/subscriptionStatus");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: "",
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: "",
    },
    invoiceNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    invoiceGeneratedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PAYMENT_STATUS),
      default: SUBSCRIPTION_PAYMENT_STATUS.PENDING,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
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

subscriptionPaymentSchema.index({ host: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model(
  "SubscriptionPayment",
  subscriptionPaymentSchema
);