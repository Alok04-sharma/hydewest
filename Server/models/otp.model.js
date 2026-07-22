const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["login"],
      default: "login",
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL Index
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ email: 1 });

module.exports = mongoose.model("OTP", otpSchema);