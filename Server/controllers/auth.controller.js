const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const ROLES = require("../constants/roles");

const { saveOTP, verifyOTP } = require("../services/otp.service");
const { sendOTPEmail } = require("../services/mail.service");

const generateToken = require("../utils/generateToken");
const sendResponse = require("../utils/sendResponse");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// ======================================
// Register / Direct Signup
// ======================================
const registerUser = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();

  // Validator public signup me sirf guest/host allow karta hai.
  const selectedRole =
    req.body.role === ROLES.HOST ? ROLES.HOST : ROLES.GUEST;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return sendResponse(
      res,
      409,
      false,
      "Aapka account pehle se bana hua hai! Kripya Login karein."
    );
  }

  const user = await User.create({
    name,
    email,
    phone,
    role: selectedRole,
    isHost: selectedRole === ROLES.HOST,
    isVerified: true,
  });

  const token = generateToken(user._id);

  return sendResponse(res, 201, true, "Account successfully ban gaya!", {
    token,
    user,
  });
});

// ======================================
// Send OTP for Login
// ======================================
const sendOTP = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  const existingUser = await User.findOne({
    email,
    isDeleted: false,
  });

  if (!existingUser) {
    return sendResponse(
      res,
      404,
      false,
      "Account nahi mila! Kripya pehle Signup karein."
    );
  }

  const otp = await saveOTP(email);

  if (process.env.NODE_ENV !== "production") {
    console.log("\n========================================");
    console.log(`DEV OTP for [${email}]: ${otp}`);
    console.log("========================================\n");
  }

  try {
    await sendOTPEmail(email, otp);
    console.log(`OTP email sent successfully to ${email}`);
  } catch (mailError) {
    console.error("Mail Send Error:", mailError.message);

    return sendResponse(
      res,
      500,
      false,
      "Email bhejne mein error aaya. Kripya mail settings check karein."
    );
  }

  return sendResponse(
    res,
    200,
    true,
    "OTP aapke email par bhej diya gaya hai."
  );
});

// ======================================
// Verify OTP and Complete Login
// ======================================
const verifyUserOTP = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();

  const result = await verifyOTP(email, otp);

  if (!result.success) {
    return sendResponse(res, 400, false, result.message);
  }

  const user = await User.findOne({
    email,
    isDeleted: false,
  });

  if (!user) {
    return sendResponse(
      res,
      404,
      false,
      "Aapka account nahi mila. Kripya pehle Signup karein!"
    );
  }

  const token = generateToken(user._id);

  return sendResponse(res, 200, true, "Login Successful!", {
    token,
    user,
  });
});

// ======================================
// Get Profile
// ======================================
const getProfile = asyncHandler(async (req, res) => {
  return sendResponse(
    res,
    200,
    true,
    "Profile fetched successfully.",
    req.user
  );
});

// ======================================
// Update Profile
// ======================================
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return sendResponse(res, 404, false, "User account nahi mila.");
  }

  const name = String(req.body.name || "").trim();
  const phone =
    req.body.phone !== undefined ? String(req.body.phone).trim() : undefined;

  if (name) {
    user.name = name;
  }

  if (phone !== undefined) {
    user.phone = phone;
  }

  if (req.file) {
    try {
      const avatarImage = await uploadToCloudinary(
        req.file.buffer,
        "StayNest/Avatars"
      );

      user.avatar = avatarImage?.url || "";
    } catch (uploadError) {
      console.error("Avatar Upload Error:", uploadError.message);

      return sendResponse(
        res,
        500,
        false,
        "Avatar photo upload karne me error aaya."
      );
    }
  }

  await user.save();

  return sendResponse(
    res,
    200,
    true,
    "Profile successfully update ho gayi!",
    user
  );
});

// ======================================
// Logout
// ======================================
const logout = asyncHandler(async (req, res) => {
  return sendResponse(res, 200, true, "Logged out successfully.");
});

module.exports = {
  registerUser,
  sendOTP,
  verifyUserOTP,
  getProfile,
  updateProfile,
  logout,
};
