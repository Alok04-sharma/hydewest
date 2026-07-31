const { rateLimit } = require("express-rate-limit");

const createLimiter = ({
  windowMs,
  limit,
  message,
  skipSuccessfulRequests = false,
}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        message,
        requestId: req.requestId,
      }),
  });

const globalApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: "Too many requests. Please try again after a few minutes.",
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  message: "Too many signup attempts. Please try again later.",
});

const otpSendLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  message: "Too many OTP requests. Please wait before requesting another OTP.",
});

const otpVerifyLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  message: "Too many OTP verification attempts. Please try again later.",
});

const paymentLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many payment requests. Please wait and try again.",
});

const bookingLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: "Too many booking requests. Please wait and try again.",
});

const aiLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  message: "AI request limit reached. Please try again later.",
});

const avatarUploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many avatar upload attempts. Please try again later.",
});

const propertyUploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  message: "Too many property media uploads. Please try again later.",
});

module.exports = {
  globalApiLimiter,
  registerLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  paymentLimiter,
  bookingLimiter,
  aiLimiter,
  avatarUploadLimiter,
  propertyUploadLimiter,
};