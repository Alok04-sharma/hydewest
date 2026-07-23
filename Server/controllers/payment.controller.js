const asyncHandler = require("express-async-handler");
const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Payment = require("../models/payment.model");
const Booking = require("../models/booking.model");
const Apartment = require("../models/apartment.model");
const sendResponse = require("../utils/sendResponse");

const createPaymentOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.body.bookingId,
    guest: req.user._id,
    isDeleted: false,
  });

  if (!booking) return sendResponse(res, 404, false, "Booking not found.");
  if (booking.status === "cancelled") {
    return sendResponse(res, 400, false, "Cancelled booking cannot be paid.");
  }

  const existingPayment = await Payment.findOne({
    booking: booking._id,
    status: "success",
    isDeleted: false,
  });

  if (existingPayment) {
    return sendResponse(res, 400, false, "Payment already completed.");
  }

  const order = await razorpay.orders.create({
    amount: Math.round(booking.pricing.totalAmount * 100),
    currency: booking.pricing.currency,
    receipt: `booking_${booking._id}`,
    notes: { bookingId: booking._id.toString() },
  });

  const payment = await Payment.create({
    user: req.user._id,
    booking: booking._id,
    razorpayOrderId: order.id,
    amount: booking.pricing.totalAmount,
    currency: booking.pricing.currency,
    status: "pending",
  });

  booking.history.push({
    type: "payment_order_created",
    title: "Payment order created",
    description: `Razorpay order ${order.id} created for booking payment.`,
    status: booking.status,
    paymentStatus: "pending",
    changedBy: req.user._id,
    changedAt: new Date(),
  });

  await booking.save();
  return sendResponse(res, 201, true, "Payment order created successfully.", {
    payment,
    order,
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (generatedSignature !== razorpaySignature) {
    return sendResponse(res, 400, false, "Payment verification failed.");
  }

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) return sendResponse(res, 404, false, "Payment record not found.");

  if (payment.status === "success") {
    return sendResponse(res, 200, true, "Payment already verified.", payment);
  }

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = "success";
  payment.paidAt = new Date();
  await payment.save();

  const booking = await Booking.findById(payment.booking);

  if (booking) {
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.history.push({
      type: "payment_verified",
      title: "Payment verified",
      description: `Payment ${razorpayPaymentId} verified successfully. Booking confirmed.`,
      status: "confirmed",
      paymentStatus: "paid",
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    const couponCode = String(booking.pricing?.couponCode || "").trim().toUpperCase();

    if (couponCode && !booking.couponUsageRecorded) {
      const apartment = await Apartment.findById(booking.apartment);
      const coupon = apartment?.coupons?.find(
        (item) => String(item.code || "").toUpperCase() === couponCode
      );

      if (coupon) {
        const usageLimit = Number(coupon.usageLimit || 0);
        const usedCount = Number(coupon.usedCount || 0);

        if (usageLimit === 0 || usedCount < usageLimit) {
          coupon.usedCount = usedCount + 1;
          await apartment.save();
          booking.couponUsageRecorded = true;
        }
      }
    }

    await booking.save();
  }

  return sendResponse(res, 200, true, "Payment verified successfully.", payment);
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    user: req.user._id,
    isDeleted: false,
  })
    .populate("booking", "checkIn checkOut pricing status paymentStatus")
    .sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Payment history fetched successfully.", payments);
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
};
