const mongoose = require("mongoose");

const {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} = require("../constants/subscriptionStatus");

const subscriptionSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
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
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PAYMENT_STATUS),
      default: SUBSCRIPTION_PAYMENT_STATUS.PENDING,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
      index: true,
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    nextRenewalDate: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    // Legacy/Admin expiry notification timestamp.
    expiryNotifiedAt: {
      type: Date,
      default: null,
    },
    // Host-side expiry notification is tracked separately so old
    // subscriptions can receive the Host notification after deployment.
    hostExpiryNotifiedAt: {
      type: Date,
      default: null,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPayment",
      default: null,
    },
    razorpayOrderId: {
      type: String,
      default: "",
      index: true,
    },
    razorpayPaymentId: {
      type: String,
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

subscriptionSchema.index({ host: 1, status: 1, expiryDate: -1 });
subscriptionSchema.index({ paymentStatus: 1, createdAt: -1 });
subscriptionSchema.index({ planCode: 1, createdAt: -1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);