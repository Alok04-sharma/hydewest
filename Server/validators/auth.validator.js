const { z } = require("zod");
const ROLES = require("../constants/roles");

const emailSchema = z
  .string({
    required_error: "Email is required",
  })
  .trim()
  .email("Please enter a valid email")
  .transform((email) => email.toLowerCase());

const registerSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(80, "Name is too long"),

  email: emailSchema,

  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .optional()
    .default(""),

  // Public signup can create only Guest or Host accounts.
  role: z.enum([ROLES.GUEST, ROLES.HOST]).optional().default(ROLES.GUEST),

  referralCode: z
    .string()
    .trim()
    .max(40, "Referral code is too long")
    .optional()
    .default(""),
});

const sendOTPSchema = z.object({
  email: emailSchema,
});

const verifyOTPSchema = z.object({
  email: emailSchema,

  otp: z
    .string({
      required_error: "OTP is required",
    })
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

module.exports = {
  registerSchema,
  sendOTPSchema,
  verifyOTPSchema,
};