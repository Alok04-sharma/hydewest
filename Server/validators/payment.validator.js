const { z } = require("zod");

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid resource identifier");

const razorpayOrderIdSchema = z
  .string()
  .trim()
  .regex(/^order_[A-Za-z0-9]+$/, "Invalid Razorpay order ID")
  .max(100);

const razorpayPaymentIdSchema = z
  .string()
  .trim()
  .regex(/^pay_[A-Za-z0-9]+$/, "Invalid Razorpay payment ID")
  .max(100);

const razorpaySignatureSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{64}$/, "Invalid Razorpay signature");

const paymentVerificationSchema = z
  .object({
    razorpayOrderId: razorpayOrderIdSchema,
    razorpayPaymentId: razorpayPaymentIdSchema,
    razorpaySignature: razorpaySignatureSchema,
  })
  .strict();

const bookingPaymentOrderSchema = z
  .object({
    bookingId: objectIdSchema,
  })
  .strict();

const planOrderSchema = z
  .object({
    planCode: z.string().trim().min(1).max(50),
  })
  .strict();

module.exports = {
  bookingPaymentOrderSchema,
  paymentVerificationSchema,
  planOrderSchema,
};