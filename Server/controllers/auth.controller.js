const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");

const {
  saveOTP,
  verifyOTP,
} = require("../services/otp.service");

const {
  sendOTPEmail,
} = require("../services/mail.service");

const generateToken = require("../utils/generateToken");
const sendResponse = require("../utils/sendResponse");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const { processReferralRegistration } = require("../services/referral.service");

const isSuspended = (user) => {
  return (
    user?.status === USER_STATUS.SUSPENDED ||
    user?.status === USER_STATUS.BLOCKED
  );
};

const getSuspensionMessage = (user) => {
  const reason =
    user?.moderation?.suspensionReason;

  return reason
    ? `Your account is suspended: ${reason}`
    : "Your account is suspended. Please contact platform support.";
};

// ======================================
// Register / Direct Signup
// ======================================

const registerUser = asyncHandler(
  async (req, res) => {
    const name = String(
      req.body.name || ""
    ).trim();

    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const phone = String(
      req.body.phone || ""
    ).trim();

    // Public registration can create only Guest or Host accounts.
    const selectedRole =
      req.body.role === ROLES.HOST
        ? ROLES.HOST
        : ROLES.GUEST;

    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return sendResponse(
        res,
        409,
        false,
        "An account with this email already exists. Please sign in."
      );
    }

    const user = await User.create({
      name,
      email,
      phone,
      role: selectedRole,
      isHost:
        selectedRole === ROLES.HOST,
      isVerified: true,
      status: USER_STATUS.ACTIVE,
    });

    if (selectedRole === ROLES.GUEST && req.body.referralCode) {
      try {
        await processReferralRegistration({
          code: req.body.referralCode,
          guest: user,
        });
      } catch (referralError) {
        console.error(
          "Referral Registration Error:",
          referralError.message
        );
      }
    }

    const token = generateToken(
      user._id
    );

    return sendResponse(
      res,
      201,
      true,
      "Account created successfully.",
      {
        token,
        user,
      }
    );
  }
);

// ======================================
// Send OTP for Login
// ======================================

const sendOTP = asyncHandler(
  async (req, res) => {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const existingUser =
      await User.findOne({
        email,
      });

    if (!existingUser) {
      return sendResponse(
        res,
        404,
        false,
        "Account not found. Please register first."
      );
    }

    if (
      existingUser.isDeleted ||
      existingUser.status ===
        USER_STATUS.REMOVED
    ) {
      return sendResponse(
        res,
        403,
        false,
        "Your account has been removed from the platform."
      );
    }

    if (isSuspended(existingUser)) {
      return sendResponse(
        res,
        403,
        false,
        getSuspensionMessage(
          existingUser
        )
      );
    }

    const otp = await saveOTP(email);

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.log(
        "\n========================================"
      );

      console.log(
        `DEV OTP for [${email}]: ${otp}`
      );

      console.log(
        "========================================\n"
      );
    }

    try {
      await sendOTPEmail(
        email,
        otp
      );

      console.log(
        `OTP email sent successfully to ${email}`
      );
    } catch (mailError) {
      console.error(
        "Mail Send Error:",
        mailError.message
      );

      return sendResponse(
        res,
        500,
        false,
        "The email could not be sent. Please check the mail configuration."
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "The OTP has been sent to your email address."
    );
  }
);

// ======================================
// Verify OTP and Complete Login
// ======================================

const verifyUserOTP = asyncHandler(
  async (req, res) => {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const otp = String(
      req.body.otp || ""
    ).trim();

    const result =
      await verifyOTP(
        email,
        otp
      );

    if (!result.success) {
      return sendResponse(
        res,
        400,
        false,
        result.message
      );
    }

    const user =
      await User.findOne({
        email,
      });

    if (!user) {
      return sendResponse(
        res,
        404,
        false,
        "Account not found. Please register first."
      );
    }

    if (
      user.isDeleted ||
      user.status ===
        USER_STATUS.REMOVED
    ) {
      return sendResponse(
        res,
        403,
        false,
        "Your account has been removed from the platform."
      );
    }

    if (isSuspended(user)) {
      return sendResponse(
        res,
        403,
        false,
        getSuspensionMessage(user)
      );
    }

    user.lastLoginAt =
      new Date();

    await user.save();

    const token =
      generateToken(user._id);

    return sendResponse(
      res,
      200,
      true,
      "Login Successful!",
      {
        token,
        user,
      }
    );
  }
);

// ======================================
// Get Profile
// ======================================

const getProfile = asyncHandler(
  async (req, res) => {
    return sendResponse(
      res,
      200,
      true,
      "Profile fetched successfully.",
      req.user
    );
  }
);

// ======================================
// Update Profile
// ======================================

const updateProfile = asyncHandler(
  async (req, res) => {
    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return sendResponse(
        res,
        404,
        false,
        "User account not found."
      );
    }

    const name = String(
      req.body.name || ""
    ).trim();

    const phone =
      req.body.phone !== undefined
        ? String(
            req.body.phone
          ).trim()
        : undefined;

    if (name) {
      user.name = name;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (req.file) {
      try {
        const avatarImage =
          await uploadToCloudinary(
            req.file.buffer,
            "StayNest/Avatars"
          );

        user.avatar =
          avatarImage?.url || "";
      } catch (uploadError) {
        console.error(
          "Avatar Upload Error:",
          uploadError.message
        );

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
  }
);

// ======================================
// Logout
// ======================================

const logout = asyncHandler(
  async (req, res) => {
    return sendResponse(
      res,
      200,
      true,
      "Logged out successfully."
    );
  }
);

module.exports = {
  registerUser,
  sendOTP,
  verifyUserOTP,
  getProfile,
  updateProfile,
  logout,
};