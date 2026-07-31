const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");

const {
  saveOTP,
  hasPendingRegistration,
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
  const reason = user?.moderation?.suspensionReason;

  return reason
    ? `Your account is suspended: ${reason}`
    : "Your account is suspended. Please contact platform support.";
};

const sendOtpMail = async ({ email, otp, context }) => {
  try {
    await sendOTPEmail(email, otp);

    if (process.env.NODE_ENV !== "production") {
      console.log(`${context} OTP email sent successfully to ${email}`);
    }
  } catch (mailError) {
    console.error(`${context} OTP mail failed:`, mailError.message);

    const error = new Error(
      "The verification email could not be sent. Please check the mail configuration and try again."
    );
    error.statusCode = 503;
    throw error;
  }
};

const logDevelopmentOtp = (email, otp) => {
  if (
    process.env.NODE_ENV !== "production" &&
    String(process.env.LOG_DEV_OTP || "false").toLowerCase() === "true"
  ) {
    console.log("\n========================================");
    console.log(`DEV OTP for [${email}]: ${otp}`);
    console.log("========================================\n");
  }
};

// ======================================
// Register: create only a pending OTP record
// ======================================

const registerUser = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const phone = String(req.body.phone || "").trim();

  // Public registration can create only Guest or Host accounts.
  const selectedRole =
    req.body.role === ROLES.HOST ? ROLES.HOST : ROLES.GUEST;

  const existingUser = await User.findOne({ email }).select(
    "_id isDeleted status"
  );

  if (existingUser) {
    // Do not reveal whether the email is registered. For an active account,
    // treat this as a login OTP request; submitted signup profile fields are ignored.
    if (
      !existingUser.isDeleted &&
      existingUser.status !== USER_STATUS.REMOVED &&
      !isSuspended(existingUser)
    ) {
      const loginOtp = await saveOTP(email, { purpose: "login" });
      logDevelopmentOtp(email, loginOtp);
      await sendOtpMail({ email, otp: loginOtp, context: "Existing account" });
    }

    return sendResponse(
      res,
      200,
      true,
      "If this email can be used, an OTP has been sent.",
      {
        requiresOtp: true,
        email,
      }
    );
  }

  // A real User is deliberately NOT created before email ownership is proven.
  // This prevents email pre-registration/account-pre-hijacking attacks.
  const otp = await saveOTP(email, {
    purpose: "register",
    registrationData: {
      name,
      phone,
      role: selectedRole,
      referralCode:
        selectedRole === ROLES.GUEST
          ? String(req.body.referralCode || "").trim()
          : "",
    },
  });

  logDevelopmentOtp(email, otp);
  await sendOtpMail({ email, otp, context: "Registration" });

  return sendResponse(
    res,
    201,
    true,
    "Registration OTP sent. Verify your email to create the account.",
    {
      requiresOtp: true,
      email,
    }
  );
});

// ======================================
// Send OTP for login or pending signup
// ======================================

const sendOTP = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (
      existingUser.isDeleted ||
      existingUser.status === USER_STATUS.REMOVED
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
        getSuspensionMessage(existingUser)
      );
    }

    const otp = await saveOTP(email, { purpose: "login" });
    logDevelopmentOtp(email, otp);
    await sendOtpMail({ email, otp, context: "Login" });

    return sendResponse(
      res,
      200,
      true,
      "If an account exists for this email, an OTP has been sent."
    );
  }

  // Registration OTP can be resent only while a valid pending registration exists.
  const pendingRegistration = await hasPendingRegistration(email);

  if (pendingRegistration) {
    const otp = await saveOTP(email, { purpose: "register" });
    logDevelopmentOtp(email, otp);
    await sendOtpMail({ email, otp, context: "Registration" });
  }

  // Keep unknown-email and pending-registration responses identical.
  return sendResponse(
    res,
    200,
    true,
    "If an account or pending registration exists for this email, an OTP has been sent."
  );
});

// ======================================
// Verify OTP and create/login the account
// ======================================

const verifyUserOTP = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const otp = String(req.body.otp || "").trim();

  let user = await User.findOne({ email });

  if (user) {
    const result = await verifyOTP(email, otp, { purpose: "login" });

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    if (user.isDeleted || user.status === USER_STATUS.REMOVED) {
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

    // Supports legacy unverified users while keeping all new signups pending-only.
    user.isVerified = true;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    const result = await verifyOTP(email, otp, { purpose: "register" });

    if (!result.success || !result.registrationData) {
      return sendResponse(
        res,
        400,
        false,
        "OTP is invalid or has expired."
      );
    }

    const registration = result.registrationData;

    try {
      user = await User.create({
        name: registration.name,
        email,
        phone: registration.phone || "",
        role:
          registration.role === ROLES.HOST ? ROLES.HOST : ROLES.GUEST,
        isHost: registration.role === ROLES.HOST,
        isVerified: true,
        status: USER_STATUS.ACTIVE,
        lastLoginAt: new Date(),
      });
    } catch (createError) {
      // Concurrent OTP verification requests may race against the unique email index.
      if (createError?.code !== 11000) {
        throw createError;
      }

      user = await User.findOne({ email });

      if (!user) {
        throw createError;
      }
    }

    if (
      user.role === ROLES.GUEST &&
      registration.referralCode
    ) {
      try {
        await processReferralRegistration({
          code: registration.referralCode,
          guest: user,
        });
      } catch (referralError) {
        console.error(
          "Referral verification processing failed:",
          referralError.message
        );
      }
    }
  }

  const tokenUser = await User.findById(user._id).select("+tokenVersion");
  const token = generateToken(tokenUser);

  return sendResponse(res, 200, true, "Login Successful!", {
    token,
    user,
  });
});

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

    if (name && (name.length < 2 || name.length > 80)) {
      return sendResponse(res, 400, false, "Name must contain 2 to 80 characters.");
    }

    if (phone !== undefined && phone.length > 20) {
      return sendResponse(res, 400, false, "Phone number is too long.");
    }

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

const logout = asyncHandler(async (req, res) => {
  // Invalidate every previously issued JWT for this account. This is safer
  // than a client-only logout because a copied token stops working as well.
  await User.updateOne(
    { _id: req.user._id },
    { $inc: { tokenVersion: 1 } }
  );

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