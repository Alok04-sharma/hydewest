require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Booking = require("../models/booking.model");
const Payment = require("../models/payment.model");
const SubscriptionPayment = require("../models/subscriptionPayment.model");
const Subscription = require("../models/subscription.model");
const Apartment = require("../models/apartment.model");
const User = require("../models/user.model");
const Revenue = require("../models/revenue.model");
const { HOST_COMMISSION, REVENUE_TYPE } = require("../constants/revenue");
const { enforceFreeHostListingLimit } = require("../services/subscription.service");

const paidPaymentFilter = {
  isDeleted: { $ne: true },
  status: { $in: ["paid", "success", "captured"] },
};

const inferHostTierAt = async (hostId, paidAt) => {
  const subscription = await Subscription.findOne({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
    startDate: { $lte: paidAt },
    expiryDate: { $gt: paidAt },
  }).select("_id");
  return subscription ? "subscribed" : "free";
};

const run = async () => {
  await connectDB();
  let bookingRevenueRows = 0;
  let subscriptionRevenueRows = 0;

  const payments = await Payment.find(paidPaymentFilter).select(
    "booking amount totalAmount paidAt createdAt razorpayPaymentId status"
  );

  for (const payment of payments) {
    const booking = await Booking.findById(payment.booking).select(
      "host apartment totalAmount finalAmount pricing checkIn createdAt hostShare adminShare revenueType"
    );
    if (!booking) continue;
    const apartment = await Apartment.findById(booking.apartment).select(
      "location.city location.area"
    );
    const paidAt = payment.paidAt || payment.createdAt || booking.createdAt || new Date();
    const grossAmount = Number(
      booking.totalAmount || booking.finalAmount || booking.pricing?.finalAmount || payment.totalAmount || payment.amount || 0
    );
    if (grossAmount <= 0) continue;

    const existingTier =
      booking.revenueType === "subscribed_host_commission"
        ? "subscribed"
        : booking.revenueType === "free_host_commission"
          ? "free"
          : null;
    const tier = existingTier || (await inferHostTierAt(booking.host, paidAt));
    const bookingRevenueType =
      tier === "subscribed"
        ? "subscribed_host_commission"
        : "free_host_commission";
    const adminPercent = tier === "subscribed"
      ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
      : HOST_COMMISSION.FREE_ADMIN_PERCENT;
    const adminShare = Number(booking.adminShare || (grossAmount * adminPercent) / 100);
    const hostShare = Number(booking.hostShare || grossAmount - adminShare);

    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: {
          totalAmount: grossAmount,
          hostShare,
          adminShare,
          revenueType: bookingRevenueType,
          paymentStatus: "paid",
          hostCommissionPercentage: adminPercent,
        },
      }
    );
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          totalAmount: grossAmount,
          hostShare,
          adminShare,
          revenueType: bookingRevenueType,
        },
      }
    );
    await Revenue.updateOne(
      { sourceKey: `booking-commission:${payment._id}` },
      {
        $setOnInsert: {
          revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
          amount: adminShare,
          grossAmount,
          hostShare,
          adminShare,
          booking: booking._id,
          payment: payment._id,
          host: booking.host,
          apartment: booking.apartment,
          city: apartment?.location?.city || "",
          area: apartment?.location?.area || "",
          sourceKey: `booking-commission:${payment._id}`,
          date: paidAt,
          metadata: { backfilled: true, hostTier: tier },
        },
      },
      { upsert: true }
    );
    bookingRevenueRows += 1;
  }

  const subscriptionPayments = await SubscriptionPayment.find({
    isDeleted: { $ne: true },
    status: "success",
  }).select("host subscription amount paidAt createdAt razorpayPaymentId");

  for (const payment of subscriptionPayments) {
    const amount = Number(payment.amount || 0);
    if (amount <= 0) continue;
    await Revenue.updateOne(
      { sourceKey: `host-subscription:${payment._id}` },
      {
        $setOnInsert: {
          revenueType: REVENUE_TYPE.HOST_SUBSCRIPTION,
          amount,
          grossAmount: amount,
          adminShare: amount,
          hostShare: 0,
          subscriptionPayment: payment._id,
          host: payment.host,
          sourceKey: `host-subscription:${payment._id}`,
          date: payment.paidAt || payment.createdAt || new Date(),
          metadata: { backfilled: true, subscriptionId: payment.subscription },
        },
      },
      { upsert: true }
    );
    subscriptionRevenueRows += 1;
  }

  const hosts = await User.find({ role: "host", isDeleted: { $ne: true } }).select("_id");
  for (const host of hosts) {
    const activeSubscription = await Subscription.findOne({
      host: host._id,
      isDeleted: false,
      paymentStatus: "success",
      startDate: { $lte: new Date() },
      expiryDate: { $gt: new Date() },
    }).sort({ expiryDate: -1 });
    if (!activeSubscription) {
      await enforceFreeHostListingLimit(
        host._id,
        "Phase-1 Free Host listing limit applied during migration."
      );
    }

    const listingCount = await Apartment.countDocuments({ host: host._id, isDeleted: false });
    await User.updateOne(
      { _id: host._id },
      {
        $set: {
          subscriptionStatus: activeSubscription ? "active" : "none",
          subscriptionExpiry: activeSubscription?.expiryDate || null,
          freeListingCount: listingCount,
          commissionPercentage: activeSubscription
            ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
            : HOST_COMMISSION.FREE_ADMIN_PERCENT,
        },
      }
    );
  }

  console.log(`Phase-1 backfill complete: ${bookingRevenueRows} booking rows, ${subscriptionRevenueRows} subscription rows.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Phase-1 backfill failed:", error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});