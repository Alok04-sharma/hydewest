const mongoose = require("mongoose");

const registrationDataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },
    role: {
      type: String,
      enum: ["guest", "host"],
    },
    referralCode: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    purpose: {
      type: String,
      enum: ["login", "register"],
      default: "login",
    },
    registrationData: {
      type: registrationDataSchema,
      select: false,
      default: undefined,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model("OTP", otpSchema);