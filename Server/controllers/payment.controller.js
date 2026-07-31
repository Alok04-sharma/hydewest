const asyncHandler = require("express-async-handler");
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
const {
  verifyRazorpayCheckout,
  claimPaymentForProcessing,
  createHttpError,
} = require("../utils/razorpaySecurity");
const {
  calculateBookingShares,
  recordBookingCommission,
} = require("../services/revenue.service");

const ORDER_REUSE_MS = 15 * 60 * 1000;

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
  `SN-BKG-${paidAt.getUTCFullYear()}${String(
    paidAt.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(payment._id).slice(-8).toUpperCase()}`;

const getRequiredPaymentMethod = (booking) =>
  booking.pricing?.couponPaymentMethod !== "any"
    ? booking.pricing?.couponPaymentMethod
    : booking.pricing?.preferredPaymentMethod || "any";

const buildOrderResponse = ({ order, payment, booking, user }) => {
  const requiredPaymentMethod = getRequiredPaymentMethod(booking);

  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    payment,
    order,
    guest: {
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    requiredPaymentMethod,
    checkoutConfig: buildCheckoutConfig(requiredPaymentMethod),
  };
};

const findReusableOrder = async ({ booking, userId }) => {
  const recentPayment = await Payment.findOne({
    booking: booking._id,
    user: userId,
    status: "pending",
    isDeleted: false,
    createdAt: { $gte: new Date(Date.now() - ORDER_REUSE_MS) },
  }).sort({ createdAt: -1 });

  if (!recentPayment) return null;

  try {
    const order = await razorpay.orders.fetch(recentPayment.razorpayOrderId);
    const amountMatches =
      Number(order?.amount || 0) ===
      Math.round(Number(booking.pricing.totalAmount || 0) * 100);
    const currencyMatches =
      String(order?.currency || "").toUpperCase() ===
      String(booking.pricing.currency || "INR").toUpperCase();

    if (!amountMatches || !currencyMatches) return null;

    if (["created", "attempted"].includes(String(order?.status || ""))) {
      return { payment: recentPayment, order };
    }

    if (String(order?.status || "") === "paid") {
      throw createHttpError(
        "An earlier Razorpay order is already paid. Retry payment verification instead of paying again.",
        409,
        "ORDER_ALREADY_PAID"
      );
    }
  } catch (error) {
    if (error?.code === "ORDER_ALREADY_PAID") throw error;
  }

  return null;
};

const createPaymentOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.body.bookingId,
    guest: req.user._id,
    isDeleted: false,
  });

  if (!booking) {
    return sendResponse(res, 404, false, "Booking not found.");
  }

  if (booking.status === "cancelled") {
    return sendResponse(res, 400, false, "Cancelled booking cannot be paid.");
  }

  if (
    booking.paymentStatus === "paid" ||
    (await Payment.exists({
      booking: booking._id,
      status: "success",
      isDeleted: false,
    }))
  ) {
    return sendResponse(res, 409, false, "Payment already completed.");
  }

  const totalAmount = Number(booking.pricing?.totalAmount || 0);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return sendResponse(res, 400, false, "Booking payment amount is invalid.");
  }

  const reusable = await findReusableOrder({
    booking,
    userId: req.user._id,
  });

  if (reusable) {
    return sendResponse(
      res,
      200,
      true,
      "Existing payment order reused.",
      buildOrderResponse({
        ...reusable,
        booking,
        user: req.user,
      })
    );
  }

  const order = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: booking.pricing.currency || "INR",
    receipt: `booking_${booking._id}`,
    notes: {
      bookingId: booking._id.toString(),
      guestId: req.user._id.toString(),
      paymentType: "booking",
    },
  });

  const payment = await Payment.create({
    user: req.user._id,
    booking: booking._id,
    razorpayOrderId: order.id,
    amount: totalAmount,
    currency: booking.pricing.currency || "INR",
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

  return sendResponse(
    res,
    201,
    true,
    "Payment order created successfully.",
    buildOrderResponse({ order, payment, booking, user: req.user })
  );
});

const syncApartmentCounters = async ({ booking, apartment, now }) => {
  if (!apartment) return;

  apartment.bookingCount = await Booking.countDocuments({
    apartment: apartment._id,
    paymentStatus: "paid",
    isDeleted: false,
  });

  const couponCode = String(booking.pricing?.couponCode || "")
    .trim()
    .toUpperCase();

  if (couponCode) {
    const coupon = apartment.coupons?.find(
      (item) => String(item.code || "").toUpperCase() === couponCode
    );

    if (coupon) {
      coupon.usedCount = await Booking.countDocuments({
        apartment: apartment._id,
        paymentStatus: "paid",
        isDeleted: false,
        couponUsageRecorded: true,
        "pricing.couponCode": couponCode,
      });
      booking.paymentFinalization.couponCountSyncedAt = now;
    }
  }

  await apartment.save();
  booking.paymentFinalization.apartmentCountSyncedAt = now;
};

const finalizeBookingPayment = async ({
  payment,
  booking,
  gatewayPayment,
  gatewayPaymentId,
  userId,
}) => {
  const now = new Date();
  const existingGatewayPaymentId = String(
    booking.paymentFinalization?.gatewayPaymentId || ""
  );

  if (
    existingGatewayPaymentId &&
    existingGatewayPaymentId !== String(gatewayPaymentId)
  ) {
    throw createHttpError(
      "This booking is already linked to another successful payment.",
      409,
      "BOOKING_PAYMENT_CONFLICT"
    );
  }

  const apartment = await Apartment.findById(booking.apartment);
  const alreadyFinalized = Boolean(booking.paymentFinalization?.finalizedAt);
  const actualPaymentMethod = String(gatewayPayment?.method || "unknown").toLowerCase();
  const requiredPaymentMethod = String(
    booking.pricing?.couponPaymentMethod || "any"
  ).toLowerCase();

  if (!alreadyFinalized) {
    const paymentMethodMismatch =
      ["upi", "card"].includes(requiredPaymentMethod) &&
      actualPaymentMethod !== "unknown" &&
      actualPaymentMethod !== requiredPaymentMethod;

    if (
      paymentMethodMismatch &&
      Number(booking.pricing?.discountAmount || 0) > 0
    ) {
      // Guest keeps the quoted amount. The platform absorbs the mismatch so
      // the Host is not penalized by a gateway instrument discrepancy.
      booking.pricing.paymentMethodMismatch = true;
      booking.pricing.hostPayableAmount =
        Number(booking.pricing.hostPayableAmount || 0) +
        Number(booking.pricing.discountAmount || 0);
      booking.pricing.platformDiscountAmount =
        Number(booking.pricing.platformDiscountAmount || 0) +
        Number(booking.pricing.discountAmount || 0);
    }

    const hasRevenueSnapshot =
      Number(booking.totalAmount || 0) > 0 &&
      Number(booking.hostShare || 0) >= 0 &&
      Number(booking.adminShare || 0) >= 0;

    const shares = hasRevenueSnapshot
      ? {
          grossAmount: Number(booking.totalAmount),
          hostShare: Number(booking.hostShare),
          adminShare: Number(booking.adminShare),
          commissionPercentage: Number(booking.hostCommissionPercentage || 30),
          isSubscribed:
            booking.revenueType === "subscribed_host_commission",
          hostTier:
            booking.revenueType === "subscribed_host_commission"
              ? "subscribed"
              : "free",
          subscription: null,
        }
      : await calculateBookingShares({
          hostId: booking.host,
          totalAmount: booking.pricing?.totalAmount || payment.amount,
        });

    booking.totalAmount = shares.grossAmount;
    booking.hostShare = shares.hostShare;
    booking.adminShare = shares.adminShare;
    booking.hostCommissionPercentage = shares.commissionPercentage;
    booking.revenueType = shares.isSubscribed
      ? "subscribed_host_commission"
      : "free_host_commission";
    booking.pricing.hostPayableAmount = shares.hostShare;

    payment.totalAmount = shares.grossAmount;
    payment.hostShare = shares.hostShare;
    payment.adminShare = shares.adminShare;
    payment.revenueType = booking.revenueType;
    payment.metadata = {
      ...(payment.metadata || {}),
      actualPaymentMethod,
      requiredPaymentMethod,
      paymentMethodMismatch,
      hostTier: shares.hostTier,
      hostCommissionPercentage: shares.commissionPercentage,
      hostShare: shares.hostShare,
      adminShare: shares.adminShare,
      razorpayStatus: gatewayPayment?.status,
    };

    const couponCode = String(booking.pricing?.couponCode || "")
      .trim()
      .toUpperCase();
    const couponExists = Boolean(
      couponCode &&
        apartment?.coupons?.some(
          (item) => String(item.code || "").toUpperCase() === couponCode
        )
    );

    booking.couponUsageRecorded = couponExists;
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.paymentFinalization.gatewayPaymentId = gatewayPaymentId;
    booking.paymentFinalization.finalizedAt = now;
    booking.history.push({
      type: "payment_verified",
      title: "Payment verified",
      description: `Payment ${gatewayPaymentId} verified. Booking confirmed.`,
      status: "confirmed",
      paymentStatus: "paid",
      changedBy: userId,
      changedAt: now,
    });

    await booking.save();
  }

  if (
    !booking.loyalty?.rewardRecorded &&
    Number(booking.loyalty?.expectedPoints || 0) > 0
  ) {
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

  await syncApartmentCounters({ booking, apartment, now });

  const shares = {
    grossAmount: Number(booking.totalAmount || payment.amount),
    hostShare: Number(booking.hostShare || 0),
    adminShare: Number(booking.adminShare || 0),
    commissionPercentage: Number(booking.hostCommissionPercentage || 30),
    hostTier:
      booking.revenueType === "subscribed_host_commission"
        ? "subscribed"
        : "free",
    subscription: null,
  };

  await recordBookingCommission({ booking, payment, apartment, shares });
  await booking.save();

  const notificationTasks = [
    createUserNotification({
      recipient: booking.guest,
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESSFUL,
      title: "Payment successful",
      message: `Your booking payment was successful. ${
        booking.loyalty.awardedPoints || 0
      } loyalty points were added.`,
      entityType: "Booking",
      entityId: booking._id,
      actionUrl: `/guest/bookings/${booking._id}`,
      eventKey: `guest-payment-success:${payment._id}`,
      metadata: {
        paymentId: payment._id,
        invoiceNumber: payment.invoiceNumber,
      },
    }),
    createUserNotification({
      recipient: booking.guest,
      type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
      title: "Booking confirmed",
      message:
        "Your stay is confirmed. Check your booking details for check-in information.",
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
        message: `${booking.loyalty.awardedPoints} points were added to your hydewest wallet.`,
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
};

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  let payment = await Payment.findOne({
    razorpayOrderId,
    user: req.user._id,
    isDeleted: false,
  });

  if (!payment) {
    return sendResponse(res, 404, false, "Payment record not found.");
  }

  if (payment.status === "success") {
    const booking = await Booking.findById(payment.booking);
    return sendResponse(res, 200, true, "Payment already verified.", {
      payment,
      booking,
    });
  }

  let gatewayPayment;

  try {
    gatewayPayment = await verifyRazorpayCheckout({
      razorpay,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      expectedAmount: payment.amount,
      expectedCurrency: payment.currency,
    });
  } catch (verificationError) {
    if (Number(verificationError.statusCode) === 400) {
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = verificationError.message;
      await payment.save();
    }
    throw verificationError;
  }

  const claimedPayment = await claimPaymentForProcessing({
    Model: Payment,
    paymentId: payment._id,
    ownerFilter: { user: req.user._id },
    gatewayPaymentId: razorpayPaymentId,
    gatewaySignature: razorpaySignature,
  });

  if (!claimedPayment) {
    const current = await Payment.findById(payment._id);

    if (current?.status === "success") {
      const booking = await Booking.findById(current.booking);
      return sendResponse(res, 200, true, "Payment already verified.", {
        payment: current,
        booking,
      });
    }

    if (
      current?.status === "processing" &&
      current.razorpayPaymentId === razorpayPaymentId
    ) {
      return sendResponse(
        res,
        409,
        false,
        "Payment verification is already in progress. Retry after a few seconds."
      );
    }

    return sendResponse(
      res,
      409,
      false,
      "Payment cannot be linked to this order."
    );
  }

  payment = claimedPayment;
  const booking = await Booking.findById(payment.booking);

  if (!booking) {
    throw createHttpError(
      "Booking record is missing for this payment.",
      500,
      "BOOKING_RECORD_MISSING"
    );
  }

  if (booking.status === "cancelled") {
    throw createHttpError(
      "A captured payment belongs to a cancelled booking. Manual refund review is required.",
      409,
      "CANCELLED_BOOKING_PAYMENT"
    );
  }

  const paidAt = payment.paidAt || new Date();
  payment.paidAt = paidAt;
  payment.invoiceNumber = payment.invoiceNumber || buildInvoiceNumber(payment, paidAt);
  payment.invoiceGeneratedAt = payment.invoiceGeneratedAt || paidAt;

  await finalizeBookingPayment({
    payment,
    booking,
    gatewayPayment,
    gatewayPaymentId: razorpayPaymentId,
    userId: req.user._id,
  });

  // Success is intentionally written last. If the process stops during any
  // side effect, the stale processing claim can safely resume idempotently.
  payment.status = "success";
  payment.processingStartedAt = null;
  payment.failureReason = "";
  await payment.save();

  return sendResponse(res, 200, true, "Payment verified successfully.", {
    payment,
    booking,
  });
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    user: req.user._id,
    isDeleted: false,
  })
    .populate({
      path: "booking",
      select: "checkIn checkOut pricing status paymentStatus apartment host",
      populate: { path: "apartment", select: "title images location" },
    })
    .sort({ createdAt: -1 });

  return sendResponse(
    res,
    200,
    true,
    "Payment history fetched successfully.",
    payments
  );
});

const downloadPaymentReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    user: req.user._id,
    status: "success",
    isDeleted: false,
  }).populate("booking");

  if (!payment?.booking) {
    return sendResponse(
      res,
      404,
      false,
      "Successful booking payment not found."
    );
  }

  const apartment = await Apartment.findById(payment.booking.apartment).select(
    "title location"
  );
  const payer = await User.findById(req.user._id).select("name email");

  if (!payment.invoiceNumber) {
    payment.invoiceNumber = buildInvoiceNumber(
      payment,
      payment.paidAt || new Date()
    );
    payment.invoiceGeneratedAt = new Date();
    await payment.save();
  }

  const buffer = await createBookingReceiptBuffer({
    payment,
    booking: payment.booking,
    apartment,
    payer,
  });
  const safeFileName = `${payment.invoiceNumber.replace(
    /[^a-zA-Z0-9-_]/g,
    "-"
  )}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFileName}"`
  );
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  return res.status(200).send(buffer);
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  downloadPaymentReceipt,
};