const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Payment = require("../models/payment.model");
const Booking = require("../models/booking.model");
const Apartment = require("../models/apartment.model");
const User = require("../models/user.model");
const sendResponse = require("../utils/sendResponse");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
const { awardBookingPoints } = require("../services/loyalty.service");
const { createBookingReceiptBuffer } = require("../services/invoice.service");


const buildCheckoutConfig = (method) => {
  if (!["upi", "card"].includes(method)) return null;

  const blockCode = method === "upi" ? "upi_only" : "cards_only";
  return {
    display: {
      blocks: {
        [blockCode]: {
          name: method === "upi" ? "Pay via UPI" : "Pay via Card",
          instruments: [{ method }],
        },
      },
      sequence: [`block.${blockCode}`],
      preferences: { show_default_blocks: false },
    },
  };
};

const buildInvoiceNumber = (payment, paidAt = new Date()) =>
  `SN-BKG-${paidAt.getUTCFullYear()}${String(paidAt.getUTCMonth() + 1).padStart(2, "0")}-${String(payment._id).slice(-8).toUpperCase()}`;

const createPaymentOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.body.bookingId, guest: req.user._id, isDeleted: false });
  if (!booking) return sendResponse(res, 404, false, "Booking not found.");
  if (booking.status === "cancelled") return sendResponse(res, 400, false, "Cancelled booking cannot be paid.");
  if (await Payment.exists({ booking: booking._id, status: "success", isDeleted: false })) {
    return sendResponse(res, 400, false, "Payment already completed.");
  }

  const order = await razorpay.orders.create({
    amount: Math.round(Number(booking.pricing.totalAmount || 0) * 100),
    currency: booking.pricing.currency || "INR",
    receipt: `booking_${booking._id}`,
    notes: { bookingId: booking._id.toString(), guestId: req.user._id.toString() },
  });

  const payment = await Payment.create({
    user: req.user._id,
    booking: booking._id,
    razorpayOrderId: order.id,
    amount: booking.pricing.totalAmount,
    currency: booking.pricing.currency,
    status: "pending",
    metadata: {
      hostPayableAmount: booking.pricing.hostPayableAmount,
      platformDiscountAmount: booking.pricing.platformDiscountAmount,
    },
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
    keyId: process.env.RAZORPAY_KEY_ID,
    payment,
    order,
    guest: { name: req.user.name, email: req.user.email, phone: req.user.phone },
    requiredPaymentMethod:
      booking.pricing?.couponPaymentMethod !== "any"
        ? booking.pricing?.couponPaymentMethod
        : booking.pricing?.preferredPaymentMethod || "any",
    checkoutConfig: buildCheckoutConfig(
      booking.pricing?.couponPaymentMethod !== "any"
        ? booking.pricing?.couponPaymentMethod
        : booking.pricing?.preferredPaymentMethod
    ),
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  if (generatedSignature !== razorpaySignature) return sendResponse(res, 400, false, "Payment verification failed.");

  const payment = await Payment.findOne({ razorpayOrderId, user: req.user._id, isDeleted: false });
  if (!payment) return sendResponse(res, 404, false, "Payment record not found.");
  if (payment.status === "success") {
    const booking = await Booking.findById(payment.booking);
    return sendResponse(res, 200, true, "Payment already verified.", { payment, booking });
  }

  let gatewayPayment = null;
  try {
    gatewayPayment = await razorpay.payments.fetch(razorpayPaymentId);
  } catch {
    // Signature verification is still authoritative; method metadata can remain unavailable.
  }

  const actualPaymentMethod = String(gatewayPayment?.method || "unknown").toLowerCase();
  const now = new Date();
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = "success";
  payment.paidAt = now;
  payment.invoiceNumber = buildInvoiceNumber(payment, now);
  payment.invoiceGeneratedAt = now;
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  if (!booking) return sendResponse(res, 404, false, "Booking record not found.");
  const requiredPaymentMethod = String(
    booking.pricing?.couponPaymentMethod || "any"
  ).toLowerCase();
  const paymentMethodMismatch =
    ["upi", "card"].includes(requiredPaymentMethod) &&
    actualPaymentMethod !== "unknown" &&
    actualPaymentMethod !== requiredPaymentMethod;

  if (paymentMethodMismatch && Number(booking.pricing?.discountAmount || 0) > 0) {
    // The guest keeps the quoted amount. The platform absorbs the method mismatch
    // so the Host never loses revenue because of a gateway instrument mismatch.
    booking.pricing.paymentMethodMismatch = true;
    booking.pricing.hostPayableAmount =
      Number(booking.pricing.hostPayableAmount || 0) +
      Number(booking.pricing.discountAmount || 0);
    booking.pricing.platformDiscountAmount =
      Number(booking.pricing.platformDiscountAmount || 0) +
      Number(booking.pricing.discountAmount || 0);
  }

  payment.metadata = {
    ...(payment.metadata || {}),
    actualPaymentMethod,
    requiredPaymentMethod,
    paymentMethodMismatch,
  };

  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.history.push({
    type: "payment_verified",
    title: "Payment verified",
    description: `Payment ${razorpayPaymentId} verified. Booking confirmed.`,
    status: "confirmed",
    paymentStatus: "paid",
    changedBy: req.user._id,
    changedAt: now,
  });

  const couponCode = String(booking.pricing?.couponCode || "").trim().toUpperCase();
  const apartment = await Apartment.findById(booking.apartment);
  if (couponCode && !booking.couponUsageRecorded && apartment) {
    const coupon = apartment.coupons?.find((item) => String(item.code || "").toUpperCase() === couponCode);
    if (coupon) {
      const usageLimit = Number(coupon.usageLimit || 0);
      const usedCount = Number(coupon.usedCount || 0);
      if (usageLimit === 0 || usedCount < usageLimit) {
        coupon.usedCount = usedCount + 1;
        booking.couponUsageRecorded = true;
      }
    }
  }

  if (!booking.loyalty?.rewardRecorded && Number(booking.loyalty?.expectedPoints || 0) > 0) {
    await awardBookingPoints({
      guestId: booking.guest,
      booking,
      payment,
      points: booking.loyalty.expectedPoints,
    });
    booking.loyalty.awardedPoints = booking.loyalty.expectedPoints;
    booking.loyalty.rewardRecorded = true;
    payment.loyaltyProcessedAt = now;
  }

  if (apartment) {
    apartment.bookingCount = Number(apartment.bookingCount || 0) + 1;
    await apartment.save();
  }
  await booking.save();
  await payment.save();

  const notificationTasks = [
    createUserNotification({
      recipient: booking.guest,
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESSFUL,
      title: "Payment successful",
      message: `Your booking payment was successful. ${booking.loyalty.awardedPoints || 0} loyalty points were added.`,
      entityType: "Booking",
      entityId: booking._id,
      actionUrl: `/guest/bookings/${booking._id}`,
      eventKey: `guest-payment-success:${payment._id}`,
      metadata: { paymentId: payment._id, invoiceNumber: payment.invoiceNumber },
    }),
    createUserNotification({
      recipient: booking.guest,
      type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
      title: "Booking confirmed",
      message: "Your stay is confirmed. Check your booking details for check-in information.",
      entityType: "Booking",
      entityId: booking._id,
      actionUrl: `/guest/bookings/${booking._id}`,
      eventKey: `guest-booking-confirmed:${booking._id}`,
    }),
    createUserNotification({
      recipient: booking.host,
      type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
      title: "Booking payment confirmed",
      message: "Guest payment is successful and the booking is confirmed.",
      actor: booking.guest,
      entityType: "Booking",
      entityId: booking._id,
      actionUrl: `/host/bookings/${booking._id}`,
      eventKey: `host-booking-payment-confirmed:${booking._id}`,
    }),
  ];

  if (Number(booking.loyalty?.awardedPoints || 0) > 0) {
    notificationTasks.push(
      createUserNotification({
        recipient: booking.guest,
        type: NOTIFICATION_TYPE.LOYALTY_POINTS_CREDITED,
        title: "Loyalty points added",
        message: `${booking.loyalty.awardedPoints} points were added to your StayNest wallet.`,
        entityType: "Booking",
        entityId: booking._id,
        actionUrl: "/guest/loyalty",
        eventKey: `loyalty-credit:${payment._id}`,
        metadata: {
          points: booking.loyalty.awardedPoints,
          paymentId: payment._id,
        },
      })
    );
  }

  await Promise.all(notificationTasks);

  return sendResponse(res, 200, true, "Payment verified successfully.", { payment, booking });
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id, isDeleted: false })
    .populate({
      path: "booking",
      select: "checkIn checkOut pricing status paymentStatus apartment host",
      populate: { path: "apartment", select: "title images location" },
    })
    .sort({ createdAt: -1 });
  return sendResponse(res, 200, true, "Payment history fetched successfully.", payments);
});

const downloadPaymentReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    user: req.user._id,
    status: "success",
    isDeleted: false,
  }).populate("booking");
  if (!payment?.booking) return sendResponse(res, 404, false, "Successful booking payment not found.");
  const apartment = await Apartment.findById(payment.booking.apartment).select("title location");
  const payer = await User.findById(req.user._id).select("name email");
  if (!payment.invoiceNumber) {
    payment.invoiceNumber = buildInvoiceNumber(payment, payment.paidAt || new Date());
    payment.invoiceGeneratedAt = new Date();
    await payment.save();
  }
  const buffer = await createBookingReceiptBuffer({ payment, booking: payment.booking, apartment, payer });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${payment.invoiceNumber}.pdf"`);
  return res.status(200).send(buffer);
});

module.exports = { createPaymentOrder, verifyPayment, getPaymentHistory, downloadPaymentReceipt };