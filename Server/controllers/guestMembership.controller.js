const asyncHandler = require("express-async-handler");
const razorpay = require("../config/razorpay");
const GuestMembership = require("../models/guestMembership.model");
const GuestMembershipPayment = require("../models/guestMembershipPayment.model");
const User = require("../models/user.model");
const sendResponse = require("../utils/sendResponse");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
const { createSubscriptionInvoiceBuffer } = require("../services/invoice.service");
const {
  getGuestMembershipPlan,
  getGuestMembershipPlans,
} = require("../constants/guestMembershipPlans");
const {
  getGuestMembershipSummary,
} = require("../services/guestMembership.service");
const { addMonthsUTC } = require("../services/subscription.service");
const {
  verifyRazorpayCheckout,
  claimPaymentForProcessing,
  createHttpError,
} = require("../utils/razorpaySecurity");

const ORDER_REUSE_MS = 15 * 60 * 1000;

const buildInvoiceNumber = (payment, paidAt = new Date()) =>
  `SN-GUEST-${paidAt.getUTCFullYear()}${String(
    paidAt.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(payment._id).slice(-8).toUpperCase()}`;

const getPlans = asyncHandler(async (_req, res) =>
  sendResponse(
    res,
    200,
    true,
    "Guest Premium plans fetched.",
    getGuestMembershipPlans()
  )
);

const getMyMembership = asyncHandler(async (req, res) => {
  const summary = await getGuestMembershipSummary(req.user._id);
  return sendResponse(res, 200, true, "Guest membership fetched.", summary);
});

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await GuestMembershipPayment.find({
    guest: req.user._id,
    isDeleted: false,
  })
    .populate("membership", "planCode planName startDate expiryDate status")
    .sort({ createdAt: -1 });

  return sendResponse(
    res,
    200,
    true,
    "Guest membership payments fetched.",
    payments
  );
});

const findReusableOrder = async ({ guestId, planCode }) => {
  const payment = await GuestMembershipPayment.findOne({
    guest: guestId,
    planCode,
    status: "pending",
    isDeleted: false,
    createdAt: { $gte: new Date(Date.now() - ORDER_REUSE_MS) },
  }).sort({ createdAt: -1 });

  if (!payment) return null;

  try {
    const order = await razorpay.orders.fetch(payment.razorpayOrderId);

    if (["created", "attempted"].includes(String(order?.status || ""))) {
      return { payment, order };
    }

    if (String(order?.status || "") === "paid") {
      throw createHttpError(
        "An earlier Premium order is already paid. Retry verification instead of paying again.",
        409,
        "ORDER_ALREADY_PAID"
      );
    }
  } catch (error) {
    if (error?.code === "ORDER_ALREADY_PAID") throw error;
  }

  return null;
};

const createOrder = asyncHandler(async (req, res) => {
  const plan = getGuestMembershipPlan(req.body.planCode);

  if (!plan) {
    return sendResponse(res, 400, false, "Invalid Premium plan.");
  }

  const now = new Date();
  let membership = await GuestMembership.findOne({
    guest: req.user._id,
    isDeleted: false,
  });

  if (
    membership?.status === "active" &&
    membership.expiryDate > now &&
    membership.planCode === plan.code
  ) {
    return sendResponse(
      res,
      409,
      false,
      `This plan is already purchased until ${membership.expiryDate.toLocaleDateString(
        "en-IN"
      )}.`
    );
  }

  if (!membership) {
    membership = await GuestMembership.create({ guest: req.user._id });
  }

  const reusable = await findReusableOrder({
    guestId: req.user._id,
    planCode: plan.code,
  });

  if (reusable) {
    return sendResponse(res, 200, true, "Existing Premium order reused.", {
      keyId: process.env.RAZORPAY_KEY_ID,
      order: reusable.order,
      payment: reusable.payment,
      plan,
      guest: { name: req.user.name, email: req.user.email },
    });
  }

  const order = await razorpay.orders.create({
    amount: Math.round(plan.amount * 100),
    currency: plan.currency,
    receipt: `guest_${String(req.user._id).slice(-8)}_${Date.now()}`,
    notes: {
      guestId: String(req.user._id),
      planCode: plan.code,
      paymentType: "guest_membership",
    },
  });

  const payment = await GuestMembershipPayment.create({
    guest: req.user._id,
    membership: membership._id,
    planCode: plan.code,
    planName: plan.name,
    durationMonths: plan.durationMonths,
    amount: plan.amount,
    currency: plan.currency,
    razorpayOrderId: order.id,
    status: "pending",
  });

  await createUserNotification({
    recipient: req.user._id,
    type: NOTIFICATION_TYPE.GUEST_MEMBERSHIP_PAYMENT_PENDING,
    title: "Premium payment started",
    message: `Complete payment for ${plan.name} to unlock Premium benefits.`,
    entityType: "GuestMembershipPayment",
    entityId: payment._id,
    actionUrl: "/guest/premium",
    eventKey: `guest-membership-pending:${payment._id}`,
  });

  return sendResponse(res, 201, true, "Premium payment order created.", {
    keyId: process.env.RAZORPAY_KEY_ID,
    order,
    payment,
    plan,
    guest: { name: req.user.name, email: req.user.email },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  let payment = await GuestMembershipPayment.findOne({
    razorpayOrderId,
    guest: req.user._id,
    isDeleted: false,
  });

  if (!payment) {
    return sendResponse(res, 404, false, "Premium payment not found.");
  }

  if (payment.status === "success") {
    const membership = await GuestMembership.findById(payment.membership);
    return sendResponse(res, 200, true, "Premium payment already verified.", {
      payment,
      membership,
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
    Model: GuestMembershipPayment,
    paymentId: payment._id,
    ownerFilter: { guest: req.user._id },
    gatewayPaymentId: razorpayPaymentId,
    gatewaySignature: razorpaySignature,
  });

  if (!claimedPayment) {
    const current = await GuestMembershipPayment.findById(payment._id);

    if (current?.status === "success") {
      const membership = await GuestMembership.findById(current.membership);
      return sendResponse(res, 200, true, "Premium payment already verified.", {
        payment: current,
        membership,
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
        "Premium payment verification is already in progress. Retry after a few seconds."
      );
    }

    return sendResponse(
      res,
      409,
      false,
      "Premium payment cannot be linked to this order."
    );
  }

  payment = claimedPayment;
  const plan = getGuestMembershipPlan(payment.planCode);

  if (!plan) {
    throw createHttpError(
      "Premium plan configuration is missing.",
      500,
      "PREMIUM_PLAN_MISSING"
    );
  }

  const membership = await GuestMembership.findById(payment.membership);

  if (!membership) {
    throw createHttpError(
      "Guest membership record is missing for this payment.",
      500,
      "MEMBERSHIP_RECORD_MISSING"
    );
  }

  const now = new Date();

  if (!payment.coverageStart || !payment.coverageEnd) {
    payment.coverageStart =
      membership.status === "active" && membership.expiryDate > now
        ? new Date(membership.expiryDate)
        : now;
    payment.coverageEnd = addMonthsUTC(
      payment.coverageStart,
      payment.durationMonths
    );
    await payment.save();
  }

  membership.planCode = plan.code;
  membership.planName = plan.name;
  membership.durationMonths = plan.durationMonths;
  membership.amount = plan.amount;
  membership.currency = plan.currency;
  membership.status = "active";
  membership.startDate =
    membership.startDate && membership.startDate < now
      ? membership.startDate
      : payment.coverageStart;
  membership.expiryDate = payment.coverageEnd;
  membership.nextRenewalDate = payment.coverageEnd;
  membership.activatedAt = membership.activatedAt || now;
  membership.expiredAt = null;
  membership.benefits = plan.benefits;
  membership.discountPercent = plan.discountPercent;
  membership.loyaltyMultiplier = plan.loyaltyMultiplier;
  membership.payment = payment._id;
  await membership.save();

  payment.paidAt = payment.paidAt || now;
  payment.invoiceNumber =
    payment.invoiceNumber || buildInvoiceNumber(payment, payment.paidAt);
  payment.invoiceGeneratedAt = payment.invoiceGeneratedAt || payment.paidAt;
  payment.metadata = {
    ...(payment.metadata || {}),
    razorpayStatus: gatewayPayment?.status,
    paymentMethod: gatewayPayment?.method || "unknown",
  };

  await createUserNotification({
    recipient: req.user._id,
    type: NOTIFICATION_TYPE.GUEST_MEMBERSHIP_ACTIVATED,
    title: "Premium membership active",
    message: `${plan.name} is active until ${payment.coverageEnd.toLocaleDateString(
      "en-IN"
    )}.`,
    entityType: "GuestMembership",
    entityId: membership._id,
    actionUrl: "/guest/premium",
    eventKey: `guest-membership-success:${payment._id}`,
    metadata: {
      invoiceNumber: payment.invoiceNumber,
      planCode: plan.code,
    },
  });

  // Success is persisted only after membership activation and idempotent
  // notification creation have completed.
  payment.status = "success";
  payment.processingStartedAt = null;
  payment.failedAt = null;
  payment.failureReason = "";
  await payment.save();

  return sendResponse(res, 200, true, "Premium membership activated.", {
    membership,
    payment,
  });
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const payment = await GuestMembershipPayment.findOne({
    _id: req.params.paymentId,
    guest: req.user._id,
    status: "success",
    isDeleted: false,
  }).populate("membership");

  if (!payment) {
    return sendResponse(
      res,
      404,
      false,
      "Successful Premium payment not found."
    );
  }

  if (!payment.invoiceNumber) {
    payment.invoiceNumber = buildInvoiceNumber(
      payment,
      payment.paidAt || new Date()
    );
    payment.invoiceGeneratedAt = new Date();
    await payment.save();
  }

  const payer = await User.findById(req.user._id).select("name email");
  const buffer = await createSubscriptionInvoiceBuffer({
    payment,
    subscription: payment.membership,
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
  getPlans,
  getMyMembership,
  getMyPayments,
  createOrder,
  verifyPayment,
  downloadInvoice,
};