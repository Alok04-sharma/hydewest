const OTP = require("../models/otp.model");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOTP = async (email) => {
  // Delete previous OTP
  await OTP.deleteMany({ email });

  // Generate new OTP
  const otp = generateOTP();

  // Expiry (5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Save
  await OTP.create({
    email,
    otp,
    expiresAt,
  });

  return otp;
};

const verifyOTP = async (email, enteredOTP) => {
  const otpRecord = await OTP.findOne({ email });

  if (!otpRecord) {
    return {
      success: false,
      message: "OTP not found or expired",
    };
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });

    return {
      success: false,
      message: "OTP expired",
    };
  }

  if (otpRecord.otp !== enteredOTP) {
    return {
      success: false,
      message: "Invalid OTP",
    };
  }

  // OTP verified
  await OTP.deleteOne({ _id: otpRecord._id });

  return {
    success: true,
    message: "OTP verified",
  };
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
};