const crypto = require("crypto");

const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

const createHttpError = (message, statusCode = 400, code = "PAYMENT_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const timingSafeHexEqual = (left, right) => {
  const normalizedLeft = String(left || "").trim().toLowerCase();
  const normalizedRight = String(right || "").trim().toLowerCase();

  if (
    !/^[a-f0-9]+$/.test(normalizedLeft) ||
    !/^[a-f0-9]+$/.test(normalizedRight) ||
    normalizedLeft.length !== normalizedRight.length
  ) {
    return false;
  }

  const leftBuffer = Buffer.from(normalizedLeft, "hex");
  const rightBuffer = Buffer.from(normalizedRight, "hex");

  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const verifyRazorpayCheckout = async ({
  razorpay,
  orderId,
  paymentId,
  signature,
  expectedAmount,
  expectedCurrency = "INR",
}) => {
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedPaymentId = String(paymentId || "").trim();
  const normalizedSignature = String(signature || "").trim();

  if (!normalizedOrderId || !normalizedPaymentId || !normalizedSignature) {
    throw createHttpError(
      "Incomplete Razorpay payment details.",
      400,
      "INCOMPLETE_PAYMENT_DETAILS"
    );
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${normalizedOrderId}|${normalizedPaymentId}`)
    .digest("hex");

  if (!timingSafeHexEqual(generatedSignature, normalizedSignature)) {
    throw createHttpError(
      "Razorpay signature verification failed.",
      400,
      "INVALID_PAYMENT_SIGNATURE"
    );
  }

  let gatewayPayment;

  try {
    gatewayPayment = await razorpay.payments.fetch(normalizedPaymentId);
  } catch {
    throw createHttpError(
      "Unable to confirm payment with Razorpay. Please retry shortly.",
      502,
      "RAZORPAY_LOOKUP_FAILED"
    );
  }

  const expectedAmountPaise = Math.round(Number(expectedAmount || 0) * 100);
  const expectedCurrencyCode = String(expectedCurrency || "INR").toUpperCase();

  if (String(gatewayPayment?.order_id || "") !== normalizedOrderId) {
    throw createHttpError(
      "Razorpay order does not match this payment record.",
      400,
      "PAYMENT_ORDER_MISMATCH"
    );
  }

  if (Number(gatewayPayment?.amount || 0) !== expectedAmountPaise) {
    throw createHttpError(
      "Razorpay payment amount does not match the expected amount.",
      400,
      "PAYMENT_AMOUNT_MISMATCH"
    );
  }

  if (
    String(gatewayPayment?.currency || "").toUpperCase() !==
    expectedCurrencyCode
  ) {
    throw createHttpError(
      "Razorpay payment currency does not match.",
      400,
      "PAYMENT_CURRENCY_MISMATCH"
    );
  }

  // Auto-capture normally returns captured. If the account returns authorized,
  // capture the exact verified amount server-side before granting benefits.
  if (String(gatewayPayment?.status || "") === "authorized") {
    try {
      gatewayPayment = await razorpay.payments.capture(
        normalizedPaymentId,
        expectedAmountPaise,
        expectedCurrencyCode
      );
    } catch {
      throw createHttpError(
        "Payment is authorized but could not be captured yet. Please retry shortly.",
        502,
        "PAYMENT_CAPTURE_FAILED"
      );
    }
  }

  if (String(gatewayPayment?.status || "") !== "captured") {
    throw createHttpError(
      "Razorpay payment has not been captured.",
      409,
      "PAYMENT_NOT_CAPTURED"
    );
  }

  return gatewayPayment;
};

const claimPaymentForProcessing = async ({
  Model,
  paymentId,
  ownerFilter = {},
  gatewayPaymentId,
  gatewaySignature,
  pendingStatus = "pending",
  failedStatus = "failed",
  processingStatus = "processing",
}) => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);

  return Model.findOneAndUpdate(
    {
      _id: paymentId,
      ...ownerFilter,
      isDeleted: false,
      $or: [
        { status: pendingStatus },
        { status: failedStatus },
        {
          status: processingStatus,
          processingStartedAt: { $lte: staleBefore },
          razorpayPaymentId: String(gatewayPaymentId),
        },
      ],
    },
    {
      $set: {
        status: processingStatus,
        processingStartedAt: now,
        razorpayPaymentId: String(gatewayPaymentId),
        razorpaySignature: String(gatewaySignature),
        failedAt: null,
        failureReason: "",
      },
    },
    { returnDocument: "after" }
  );
};

const markPaymentFailed = async ({
  payment,
  failedStatus = "failed",
  error,
}) => {
  if (!payment || Number(error?.statusCode || 500) >= 500) return;

  payment.status = failedStatus;
  payment.processingStartedAt = null;
  payment.failedAt = new Date();
  payment.failureReason = String(error?.message || "Payment verification failed.")
    .slice(0, 500);
  await payment.save();
};

module.exports = {
  PROCESSING_TIMEOUT_MS,
  createHttpError,
  timingSafeHexEqual,
  verifyRazorpayCheckout,
  claimPaymentForProcessing,
  markPaymentFailed,
};