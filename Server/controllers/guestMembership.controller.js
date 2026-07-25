const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const razorpay = require("../config/razorpay");
const GuestMembership = require("../models/guestMembership.model");
const GuestMembershipPayment = require("../models/guestMembershipPayment.model");
const User = require("../models/user.model");
const sendResponse = require("../utils/sendResponse");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
const { createSubscriptionInvoiceBuffer } = require("../services/invoice.service");
const { getGuestMembershipPlan, getGuestMembershipPlans } = require("../constants/guestMembershipPlans");
const { getGuestMembershipSummary } = require("../services/guestMembership.service");

const addMonthsUTC = (date, months) => {
  const value = new Date(date);
  value.setUTCMonth(value.getUTCMonth() + Number(months));
  return value;
};

const buildInvoiceNumber = (payment, paidAt = new Date()) =>
  `SN-GUEST-${paidAt.getUTCFullYear()}${String(paidAt.getUTCMonth() + 1).padStart(2, "0")}-${String(payment._id).slice(-8).toUpperCase()}`;

const getPlans = asyncHandler(async (req, res) =>
  sendResponse(res, 200, true, "Guest Premium plans fetched.", getGuestMembershipPlans())
);

const getMyMembership = asyncHandler(async (req, res) => {
  const summary = await getGuestMembershipSummary(req.user._id);
  return sendResponse(res, 200, true, "Guest membership fetched.", summary);
});

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await GuestMembershipPayment.find({ guest: req.user._id, isDeleted: false })
    .populate("membership", "planCode planName startDate expiryDate status")
    .sort({ createdAt: -1 });
  return sendResponse(res, 200, true, "Guest membership payments fetched.", payments);
});

const createOrder = asyncHandler(async (req, res) => {
  const plan = getGuestMembershipPlan(req.body.planCode);
  if (!plan) return sendResponse(res, 400, false, "Invalid Premium plan.");

  const now = new Date();
  let membership = await GuestMembership.findOne({ guest: req.user._id, isDeleted: false });
  if (membership?.status === "active" && membership.expiryDate > now && membership.planCode === plan.code) {
    return sendResponse(res, 409, false, `This plan is already purchased until ${membership.expiryDate.toLocaleDateString("en-IN")}.`);
  }
  if (!membership) membership = await GuestMembership.create({ guest: req.user._id });

  const order = await razorpay.orders.create({
    amount: Math.round(plan.amount * 100),
    currency: plan.currency,
    receipt: `guest_membership_${String(req.user._id).slice(-8)}_${Date.now()}`,
    notes: { guestId: String(req.user._id), planCode: plan.code },
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
  const payment = await GuestMembershipPayment.findOne({ razorpayOrderId, guest: req.user._id, isDeleted: false });
  if (!payment) return sendResponse(res, 404, false, "Premium payment not found.");
  if (payment.status === "success") {
    const membership = await GuestMembership.findById(payment.membership);
    return sendResponse(res, 200, true, "Premium payment already verified.", { payment, membership });
  }

  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  if (signature !== razorpaySignature) {
    payment.status = "failed";
    payment.failedAt = new Date();
    payment.failureReason = "Razorpay signature verification failed.";
    await payment.save();
    return sendResponse(res, 400, false, "Premium payment verification failed.");
  }

  const plan = getGuestMembershipPlan(payment.planCode);
  if (!plan) return sendResponse(res, 400, false, "Premium plan configuration missing.");
  const now = new Date();
  const membership = await GuestMembership.findById(payment.membership);
  const coverageStart = membership?.status === "active" && membership.expiryDate > now
    ? new Date(membership.expiryDate)
    : now;
  const coverageEnd = addMonthsUTC(coverageStart, plan.durationMonths);

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = "success";
  payment.paidAt = now;
  payment.coverageStart = coverageStart;
  payment.coverageEnd = coverageEnd;
  payment.invoiceNumber = buildInvoiceNumber(payment, now);
  payment.invoiceGeneratedAt = now;
  await payment.save();

  membership.planCode = plan.code;
  membership.planName = plan.name;
  membership.durationMonths = plan.durationMonths;
  membership.amount = plan.amount;
  membership.currency = plan.currency;
  membership.status = "active";
  membership.startDate = membership.startDate && membership.startDate < now ? membership.startDate : coverageStart;
  membership.expiryDate = coverageEnd;
  membership.nextRenewalDate = coverageEnd;
  membership.activatedAt = membership.activatedAt || now;
  membership.expiredAt = null;
  membership.benefits = plan.benefits;
  membership.discountPercent = plan.discountPercent;
  membership.loyaltyMultiplier = plan.loyaltyMultiplier;
  membership.payment = payment._id;
  await membership.save();

  await createUserNotification({
    recipient: req.user._id,
    type: NOTIFICATION_TYPE.GUEST_MEMBERSHIP_ACTIVATED,
    title: "Premium membership active",
    message: `${plan.name} is active until ${coverageEnd.toLocaleDateString("en-IN")}.`,
    entityType: "GuestMembership",
    entityId: membership._id,
    actionUrl: "/guest/premium",
    eventKey: `guest-membership-success:${payment._id}`,
    metadata: { invoiceNumber: payment.invoiceNumber, planCode: plan.code },
  });

  return sendResponse(res, 200, true, "Premium membership activated.", { membership, payment });
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const payment = await GuestMembershipPayment.findOne({
    _id: req.params.paymentId,
    guest: req.user._id,
    status: "success",
    isDeleted: false,
  }).populate("membership");
  if (!payment) return sendResponse(res, 404, false, "Successful Premium payment not found.");
  if (!payment.invoiceNumber) {
    payment.invoiceNumber = buildInvoiceNumber(payment, payment.paidAt || new Date());
    payment.invoiceGeneratedAt = new Date();
    await payment.save();
  }
  const payer = await User.findById(req.user._id).select("name email");
  const buffer = await createSubscriptionInvoiceBuffer({ payment, subscription: payment.membership, payer });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${payment.invoiceNumber}.pdf"`);
  return res.status(200).send(buffer);
});

module.exports = { getPlans, getMyMembership, getMyPayments, createOrder, verifyPayment, downloadInvoice };