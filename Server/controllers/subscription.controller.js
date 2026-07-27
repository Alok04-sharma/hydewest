const crypto = require("crypto");
const asyncHandler = require("express-async-handler");

const razorpay = require("../config/razorpay");
const Subscription = require("../models/subscription.model");
const SubscriptionPayment = require("../models/subscriptionPayment.model");
const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} = require("../constants/subscriptionStatus");
const {
  getSubscriptionPlans,
  getSubscriptionPlan,
} = require("../constants/subscriptionPlans");
const {
  addMonthsUTC,
  getHostSubscriptionSummary,
} = require("../services/subscription.service");
const {
  createAdminNotifications,
  createUserNotification,
} = require("../services/notification.service");
const {
  createSubscriptionInvoiceBuffer,
} = require("../services/invoice.service");
const sendResponse = require("../utils/sendResponse");
const { recordSubscriptionRevenue } = require("../services/revenue.service");
const { HOST_COMMISSION } = require("../constants/revenue");

const buildInvoiceNumber = (payment, paidAt = new Date()) => {
  const date = new Date(paidAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const suffix = String(payment._id).slice(-8).toUpperCase();

  return `SN-HOST-${year}${month}-${suffix}`;
};

const ensureInvoiceNumber = async (payment) => {
  if (payment.invoiceNumber) {
    return payment.invoiceNumber;
  }

  payment.invoiceNumber = buildInvoiceNumber(
    payment,
    payment.paidAt || payment.createdAt
  );
  payment.invoiceGeneratedAt = payment.invoiceGeneratedAt || new Date();
  await payment.save();

  return payment.invoiceNumber;
};

const getPlans = asyncHandler(async (req, res) => {
  return sendResponse(
    res,
    200,
    true,
    "Subscription plans fetched successfully.",
    getSubscriptionPlans()
  );
});

const getMySubscription = asyncHandler(async (req, res) => {
  const summary = await getHostSubscriptionSummary(req.user._id);

  const records = await Subscription.find({
    host: req.user._id,
    isDeleted: false,
  })
    .populate("payment")
    .sort({ createdAt: -1 })
    .limit(25);

  return sendResponse(
    res,
    200,
    true,
    "Host subscription fetched successfully.",
    {
      ...summary,
      records,
    }
  );
});

const getMySubscriptionPayments = asyncHandler(async (req, res) => {
  const payments = await SubscriptionPayment.find({
    host: req.user._id,
    isDeleted: false,
  })
    .populate(
      "subscription",
      "planCode planName status startDate expiryDate durationMonths"
    )
    .sort({ createdAt: -1 });

  return sendResponse(
    res,
    200,
    true,
    "Subscription payment history fetched successfully.",
    payments
  );
});

const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const plan = getSubscriptionPlan(req.body.planCode);

  if (!plan) {
    return sendResponse(res, 400, false, "Invalid subscription plan selected.");
  }

  const host = await User.findById(req.user._id).select(
    "name email role isHost status isDeleted"
  );

  if (!host || host.isDeleted) {
    return sendResponse(res, 404, false, "Host account not found.");
  }

  if (host.role !== ROLES.HOST && host.isHost !== true) {
    return sendResponse(
      res,
      403,
      false,
      "Only Hosts can purchase subscriptions."
    );
  }

  const now = new Date();
  const existingSamePlanCoverage = await Subscription.findOne({
    host: host._id,
    planCode: plan.code,
    isDeleted: false,
    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.SUCCESS,
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.SCHEDULED],
    },
    expiryDate: { $gt: now },
  }).sort({ expiryDate: -1 });

  if (existingSamePlanCoverage) {
    return sendResponse(
      res,
      409,
      false,
      `This plan is already purchased until ${new Date(
        existingSamePlanCoverage.expiryDate
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })}.`,
      {
        planCode: plan.code,
        purchasedUntil: existingSamePlanCoverage.expiryDate,
      }
    );
  }

  const order = await razorpay.orders.create({
    amount: Math.round(plan.amount * 100),
    currency: plan.currency,
    receipt: `sub_${Date.now()}`,
    notes: {
      hostId: String(host._id),
      planCode: plan.code,
      durationMonths: String(plan.durationMonths),
    },
  });

  const subscription = await Subscription.create({
    host: host._id,
    planCode: plan.code,
    planName: plan.name,
    durationMonths: plan.durationMonths,
    amount: plan.amount,
    currency: plan.currency,
    status: SUBSCRIPTION_STATUS.PENDING,
    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.PENDING,
    razorpayOrderId: order.id,
  });

  const payment = await SubscriptionPayment.create({
    host: host._id,
    subscription: subscription._id,
    planCode: plan.code,
    durationMonths: plan.durationMonths,
    amount: plan.amount,
    currency: plan.currency,
    razorpayOrderId: order.id,
    status: SUBSCRIPTION_PAYMENT_STATUS.PENDING,
    metadata: {
      hostName: host.name,
      hostEmail: host.email,
    },
  });

  subscription.payment = payment._id;
  await subscription.save();

  await createAdminNotifications({
    type: NOTIFICATION_TYPE.HOST_SUBSCRIPTION_PAYMENT_PENDING,
    title: "Host subscription payment pending",
    message: `${host.name || host.email} initiated payment for the ${plan.name} Host plan.`,
    actor: host._id,
    entityType: "Subscription",
    entityId: subscription._id,
    actionUrl: "/owner/subscriptions",
    metadata: {
      hostId: host._id,
      planCode: plan.code,
      amount: plan.amount,
      currency: plan.currency,
      razorpayOrderId: order.id,
    },
  });

  await createUserNotification({
    recipient: host._id,
    type: NOTIFICATION_TYPE.HOST_SUBSCRIPTION_PAYMENT_PENDING,
    title: "Subscription payment started",
    message: `Your payment for the ${plan.name} Host plan is pending. Complete the Razorpay payment to activate your subscription.`,
    actor: host._id,
    entityType: "Subscription",
    entityId: subscription._id,
    actionUrl: "/host/subscription",
    eventKey: `host-subscription-payment-pending:${payment._id}`,
    metadata: {
      subscriptionId: subscription._id,
      paymentId: payment._id,
      planCode: plan.code,
      amount: plan.amount,
      currency: plan.currency,
      razorpayOrderId: order.id,
    },
  });

  return sendResponse(
    res,
    201,
    true,
    "Subscription payment order created successfully.",
    {
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      subscription,
      payment,
      host: {
        name: host.name,
        email: host.email,
      },
    }
  );
});

const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return sendResponse(res, 400, false, "Incomplete Razorpay payment details.");
  }

  const payment = await SubscriptionPayment.findOne({
    razorpayOrderId,
    host: req.user._id,
    isDeleted: false,
  });

  if (!payment) {
    return sendResponse(
      res,
      404,
      false,
      "Subscription payment record not found."
    );
  }

  if (payment.status === SUBSCRIPTION_PAYMENT_STATUS.SUCCESS) {
    await ensureInvoiceNumber(payment);
    const existingSubscription = await Subscription.findById(
      payment.subscription
    );

    return sendResponse(
      res,
      200,
      true,
      "Subscription payment was already verified.",
      {
        subscription: existingSubscription,
        payment,
      }
    );
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (generatedSignature !== razorpaySignature) {
    payment.status = SUBSCRIPTION_PAYMENT_STATUS.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = "Razorpay signature verification failed.";
    await payment.save();

    await Subscription.findByIdAndUpdate(payment.subscription, {
      status: SUBSCRIPTION_STATUS.FAILED,
      paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.FAILED,
    });

    await createUserNotification({
      recipient: req.user._id,
      type: NOTIFICATION_TYPE.HOST_SUBSCRIPTION_PAYMENT_FAILED,
      title: "Subscription payment failed",
      message:
        "Your subscription payment could not be verified. No Host plan was activated. Please try again.",
      actor: req.user._id,
      entityType: "Subscription",
      entityId: payment.subscription,
      actionUrl: "/host/subscription/plans",
      eventKey: `host-subscription-payment-failed:${payment._id}`,
      metadata: {
        paymentId: payment._id,
        razorpayOrderId,
        failureReason: payment.failureReason,
      },
    });

    return sendResponse(
      res,
      400,
      false,
      "Subscription payment verification failed."
    );
  }

  const now = new Date();

  const latestCoverage = await Subscription.findOne({
    host: req.user._id,
    isDeleted: false,
    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.SUCCESS,
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.SCHEDULED],
    },
    expiryDate: { $gt: now },
    _id: { $ne: payment.subscription },
  }).sort({ expiryDate: -1 });

  const coverageStart =
    latestCoverage?.expiryDate && new Date(latestCoverage.expiryDate) > now
      ? new Date(latestCoverage.expiryDate)
      : now;

  const expiryDate = addMonthsUTC(coverageStart, payment.durationMonths);
  const subscriptionStatus =
    coverageStart.getTime() <= now.getTime() + 1000
      ? SUBSCRIPTION_STATUS.ACTIVE
      : SUBSCRIPTION_STATUS.SCHEDULED;

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = SUBSCRIPTION_PAYMENT_STATUS.SUCCESS;
  payment.paidAt = now;
  payment.failureReason = "";
  payment.invoiceNumber = buildInvoiceNumber(payment, now);
  payment.invoiceGeneratedAt = now;
  await payment.save();

  const subscription = await Subscription.findById(payment.subscription);

  if (!subscription) {
    return sendResponse(res, 404, false, "Subscription record not found.");
  }

  subscription.status = subscriptionStatus;
  subscription.paymentStatus = SUBSCRIPTION_PAYMENT_STATUS.SUCCESS;
  subscription.startDate = coverageStart;
  subscription.expiryDate = expiryDate;
  subscription.nextRenewalDate = expiryDate;
  subscription.activatedAt =
    subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE ? now : null;
  subscription.payment = payment._id;
  subscription.razorpayOrderId = razorpayOrderId;
  subscription.razorpayPaymentId = razorpayPaymentId;
  await subscription.save();

  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        subscriptionStatus:
          subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE
            ? "active"
            : "scheduled",
        subscriptionExpiry: expiryDate,
        commissionPercentage: HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT,
      },
    }
  );

  await recordSubscriptionRevenue({
    hostId: req.user._id,
    payment,
    subscription,
  });

  const host = await User.findById(req.user._id).select("name email");

  await createAdminNotifications({
    type: NOTIFICATION_TYPE.HOST_SUBSCRIPTION_PAYMENT_RECEIVED,
    title: "Host subscription payment received",
    message: `${host?.name || host?.email || "A host"} successfully purchased the ${subscription.planName} Host plan.`,
    actor: req.user._id,
    entityType: "Subscription",
    entityId: subscription._id,
    actionUrl: "/owner/subscriptions",
    metadata: {
      hostId: req.user._id,
      planCode: subscription.planCode,
      amount: subscription.amount,
      currency: subscription.currency,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
      razorpayPaymentId,
      invoiceNumber: payment.invoiceNumber,
    },
  });

  const hostNotificationType =
    subscriptionStatus === SUBSCRIPTION_STATUS.SCHEDULED
      ? NOTIFICATION_TYPE.HOST_SUBSCRIPTION_RENEWAL_SCHEDULED
      : NOTIFICATION_TYPE.HOST_SUBSCRIPTION_PAYMENT_RECEIVED;

  await createUserNotification({
    recipient: req.user._id,
    type: hostNotificationType,
    title:
      subscriptionStatus === SUBSCRIPTION_STATUS.SCHEDULED
        ? "Subscription renewal scheduled"
        : "Subscription activated",
    message:
      subscriptionStatus === SUBSCRIPTION_STATUS.SCHEDULED
        ? `Payment successful. Your ${subscription.planName} renewal will start on ${new Date(
            subscription.startDate
          ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}.`
        : `Payment successful. Your ${subscription.planName} Host plan is active until ${new Date(
            subscription.expiryDate
          ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}.`,
    actor: req.user._id,
    entityType: "Subscription",
    entityId: subscription._id,
    actionUrl: "/host/subscription",
    eventKey: `host-subscription-payment-success:${payment._id}`,
    metadata: {
      subscriptionId: subscription._id,
      paymentId: payment._id,
      planCode: subscription.planCode,
      amount: subscription.amount,
      currency: subscription.currency,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
      razorpayPaymentId,
      invoiceNumber: payment.invoiceNumber,
    },
  });

  return sendResponse(
    res,
    200,
    true,
    subscriptionStatus === SUBSCRIPTION_STATUS.SCHEDULED
      ? "Subscription renewal payment verified. The new plan will start after your current plan ends."
      : "Subscription activated successfully.",
    {
      subscription,
      payment,
    }
  );
});

const downloadMySubscriptionInvoice = asyncHandler(async (req, res) => {
  const payment = await SubscriptionPayment.findOne({
    _id: req.params.paymentId,
    host: req.user._id,
    isDeleted: false,
    status: SUBSCRIPTION_PAYMENT_STATUS.SUCCESS,
  }).populate(
    "subscription",
    "planCode planName durationMonths startDate expiryDate status"
  );

  if (!payment) {
    return sendResponse(
      res,
      404,
      false,
      "Successful subscription payment not found."
    );
  }

  const host = await User.findById(req.user._id).select("name email");
  const invoiceNumber = await ensureInvoiceNumber(payment);
  const pdfBuffer = await createSubscriptionInvoiceBuffer({
    payment,
    subscription: payment.subscription,
    payer: host,
  });

  const safeFileName = `${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-")}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFileName}"`
  );
  res.setHeader("Content-Length", pdfBuffer.length);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  return res.status(200).send(pdfBuffer);
});

module.exports = {
  getPlans,
  getMySubscription,
  getMySubscriptionPayments,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  downloadMySubscriptionInvoice,
};