const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Subscription = require("../models/subscription.model");
const SubscriptionPayment = require("../models/subscriptionPayment.model");
const User = require("../models/user.model");
const {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} = require("../constants/subscriptionStatus");
const {
  getRemainingTime,
  expireSubscriptions,
} = require("../services/subscription.service");
const sendResponse = require("../utils/sendResponse");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSubscriptions = asyncHandler(async (req, res) => {
  await expireSubscriptions();

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
    50
  );
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "all");
  const planCode = String(req.query.planCode || "all");
  const paymentStatus = String(req.query.paymentStatus || "all");
  const sortBy = String(req.query.sortBy || "newest");

  const query = { isDeleted: false };

  if (status !== "all" && Object.values(SUBSCRIPTION_STATUS).includes(status)) {
    query.status = status;
  }

  if (planCode !== "all") {
    query.planCode = planCode;
  }

  if (
    paymentStatus !== "all" &&
    Object.values(SUBSCRIPTION_PAYMENT_STATUS).includes(paymentStatus)
  ) {
    query.paymentStatus = paymentStatus;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const hosts = await User.find({
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).distinct("_id");

    query.$or = [
      { host: { $in: hosts } },
      { planName: regex },
      { planCode: regex },
      { razorpayOrderId: regex },
      { razorpayPaymentId: regex },
    ];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    expiring_soon: { expiryDate: 1 },
    amount_high: { amount: -1 },
    amount_low: { amount: 1 },
  };

  const skip = (page - 1) * limit;

  const [records, total, summaryRows, revenueRows] = await Promise.all([
    Subscription.find(query)
      .populate("host", "name email phone avatar status isDeleted")
      .populate("payment")
      .sort(sortMap[sortBy] || sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(query),
    Subscription.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    SubscriptionPayment.aggregate([
      {
        $match: {
          isDeleted: false,
          status: SUBSCRIPTION_PAYMENT_STATUS.SUCCESS,
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]),
  ]);

  const now = new Date();
  const subscriptions = records.map((record) => ({
    ...record,
    ...getRemainingTime(record.expiryDate, now),
  }));

  const statusSummary = Object.values(SUBSCRIPTION_STATUS).reduce(
    (result, key) => ({ ...result, [key]: 0 }),
    {}
  );

  summaryRows.forEach((row) => {
    if (row._id) statusSummary[row._id] = row.count;
  });

  return sendResponse(res, 200, true, "Subscriptions fetched successfully.", {
    subscriptions,
    summary: {
      total: summaryRows.reduce((sum, row) => sum + row.count, 0),
      ...statusSummary,
      totalRevenue: Number(revenueRows[0]?.totalRevenue || 0),
      currency: "INR",
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
    filters: { search, status, planCode, paymentStatus, sortBy },
  });
});

const getSubscriptionDetails = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.subscriptionId)) {
    return sendResponse(res, 400, false, "Invalid subscription ID.");
  }

  const subscription = await Subscription.findById(req.params.subscriptionId)
    .populate("host", "name email phone avatar status isDeleted createdAt lastLoginAt")
    .populate("payment")
    .lean();

  if (!subscription) {
    return sendResponse(res, 404, false, "Subscription not found.");
  }

  return sendResponse(res, 200, true, "Subscription details fetched successfully.", {
    ...subscription,
    ...getRemainingTime(subscription.expiryDate),
  });
});

const getSubscriptionPayments = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
    50
  );
  const status = String(req.query.status || "all");
  const search = String(req.query.search || "").trim();
  const query = { isDeleted: false };

  if (status !== "all" && Object.values(SUBSCRIPTION_PAYMENT_STATUS).includes(status)) {
    query.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const hosts = await User.find({
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).distinct("_id");

    query.$or = [
      { host: { $in: hosts } },
      { razorpayOrderId: regex },
      { razorpayPaymentId: regex },
      { planCode: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    SubscriptionPayment.find(query)
      .populate("host", "name email phone avatar")
      .populate("subscription", "planName planCode status startDate expiryDate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SubscriptionPayment.countDocuments(query),
  ]);

  return sendResponse(res, 200, true, "Subscription payment history fetched successfully.", {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  });
});

module.exports = {
  getSubscriptions,
  getSubscriptionDetails,
  getSubscriptionPayments,
};
