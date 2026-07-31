const express = require("express");

const {
  registerUser,
  sendOTP,
  verifyUserOTP,
  getProfile,
  updateProfile,
  logout,
} = require("../controllers/auth.controller");

const validate = require("../middleware/validate.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const {
  avatarUpload,
  validateAvatarSignature,
} = require("../middleware/upload.middleware");
const {
  registerLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  avatarUploadLimiter,
} = require("../middleware/rateLimit.middleware");

const {
  registerSchema,
  sendOTPSchema,
  verifyOTPSchema,
} = require("../validators/auth.validator");

const router = express.Router();

router.post("/register", registerLimiter, validate(registerSchema), registerUser);
router.post("/send-otp", otpSendLimiter, validate(sendOTPSchema), sendOTP);
router.post("/verify-otp", otpVerifyLimiter, validate(verifyOTPSchema), verifyUserOTP);
router.get("/profile", authMiddleware, getProfile);
router.put(
  "/profile",
  authMiddleware,
  avatarUploadLimiter,
  avatarUpload.single("avatar"),
  validateAvatarSignature,
  updateProfile
);
router.post("/logout", authMiddleware, logout);

module.exports = router;