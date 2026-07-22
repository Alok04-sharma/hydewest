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
const upload = require("../middleware/upload.middleware");

const {
  registerSchema,
  sendOTPSchema,
  verifyOTPSchema,
} = require("../validators/auth.validator");

const router = express.Router();

// Direct Signup / Register
router.post("/register", validate(registerSchema), registerUser);

// Send OTP for Login
router.post("/send-otp", validate(sendOTPSchema), sendOTP);

// Verify OTP and Login
router.post("/verify-otp", validate(verifyOTPSchema), verifyUserOTP);

// Get Logged-in User Profile
router.get("/profile", authMiddleware, getProfile);

// Update Profile
router.put(
  "/profile",
  authMiddleware,
  upload.single("avatar"),
  updateProfile
);

// Logout
router.post("/logout", authMiddleware, logout);

module.exports = router;
