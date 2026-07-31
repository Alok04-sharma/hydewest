const crypto = require("crypto");
const OTP = require("../models/otp.model");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PURPOSES = new Set(["login", "register"]);

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const normalizePurpose = (purpose) =>
  OTP_PURPOSES.has(String(purpose || "").toLowerCase())
    ? String(purpose).toLowerCase()
    : "login";

const getOtpHashSecret = () =>
  process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;

const hashOTP = (email, otp, purpose) =>
  crypto
    .createHmac("sha256", getOtpHashSecret())
    .update(
      `${normalizePurpose(purpose)}:${normalizeEmail(email)}:${String(otp)}`
    )
    .digest("hex");

const secureCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""), "hex");
  const rightBuffer = Buffer.from(String(right || ""), "hex");

  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const generateOTP = () =>
  String(crypto.randomInt(100000, 1000000));

const saveOTP = async (
  email,
  {
    purpose = "login",
    registrationData,
  } = {}
) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = normalizePurpose(purpose);
  const now = new Date();

  const existing = await OTP.findOne({
    email: normalizedEmail,
    purpose: normalizedPurpose,
  }).select("lastSentAt expiresAt");

  if (
    existing?.lastSentAt &&
    now.getTime() - new Date(existing.lastSentAt).getTime() <
      OTP_RESEND_COOLDOWN_MS
  ) {
    const error = new Error(
      "Please wait 60 seconds before requesting another OTP."
    );
    error.statusCode = 429;
    throw error;
  }

  const otp = generateOTP();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

  const setValues = {
    otpHash: hashOTP(normalizedEmail, otp, normalizedPurpose),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    lastSentAt: now,
    expiresAt,
  };

  if (registrationData) {
    setValues.registrationData = {
      name: String(registrationData.name || "").trim(),
      phone: String(registrationData.phone || "").trim(),
      role: registrationData.role === "host" ? "host" : "guest",
      referralCode: String(registrationData.referralCode || "").trim(),
    };
  }

  await OTP.findOneAndUpdate(
    {
      email: normalizedEmail,
      purpose: normalizedPurpose,
    },
    {
      $set: setValues,
      $setOnInsert: {
        email: normalizedEmail,
        purpose: normalizedPurpose,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );

  return otp;
};

const hasPendingRegistration = async (email) =>
  Boolean(
    await OTP.exists({
      email: normalizeEmail(email),
      purpose: "register",
      expiresAt: { $gt: new Date() },
    })
  );

const verifyOTP = async (
  email,
  enteredOTP,
  { purpose = "login" } = {}
) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = normalizePurpose(purpose);

  const otpRecord = await OTP.findOne({
    email: normalizedEmail,
    purpose: normalizedPurpose,
  }).select(
    "+otpHash +registrationData attempts maxAttempts expiresAt"
  );

  if (!otpRecord) {
    return {
      success: false,
      message: "OTP is invalid or has expired.",
    };
  }

  if (otpRecord.expiresAt <= new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });

    return {
      success: false,
      message: "OTP is invalid or has expired.",
    };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteOne({ _id: otpRecord._id });

    return {
      success: false,
      message: "Too many invalid attempts. Please request a new OTP.",
    };
  }

  const isValid = secureCompare(
    otpRecord.otpHash,
    hashOTP(normalizedEmail, enteredOTP, normalizedPurpose)
  );

  if (!isValid) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
    } else {
      await otpRecord.save();
    }

    return {
      success: false,
      message: "OTP is invalid or has expired.",
    };
  }

  const registrationData = otpRecord.registrationData
    ? {
        name: otpRecord.registrationData.name,
        phone: otpRecord.registrationData.phone,
        role: otpRecord.registrationData.role,
        referralCode: otpRecord.registrationData.referralCode,
      }
    : null;

  await OTP.deleteOne({ _id: otpRecord._id });

  return {
    success: true,
    message: "OTP verified.",
    registrationData,
  };
};

module.exports = {
  generateOTP,
  saveOTP,
  hasPendingRegistration,
  verifyOTP,
};