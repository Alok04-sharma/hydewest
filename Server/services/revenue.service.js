const Revenue = require("../models/revenue.model");
const User = require("../models/user.model");
const { REVENUE_TYPE, HOST_TIER, HOST_COMMISSION } = require("../constants/revenue");
const { getHostSubscriptionSummary } = require("./subscription.service");

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const getHostCommercialProfile = async (hostId) => {
  const summary = await getHostSubscriptionSummary(hostId);
  const isSubscribed = Boolean(summary.isActive);
  const commissionPercentage = isSubscribed
    ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
    : HOST_COMMISSION.FREE_ADMIN_PERCENT;

  await User.updateOne(
    { _id: hostId },
    {
      $set: {
        subscriptionStatus: isSubscribed ? "active" : summary.status || "none",
        subscriptionExpiry: summary.activeSubscription?.expiryDate || summary.latestSubscription?.expiryDate || null,
        commissionPercentage,
      },
    }
  );

  return {
    isSubscribed,
    hostTier: isSubscribed ? HOST_TIER.SUBSCRIBED : HOST_TIER.FREE,
    // Kept as the platform/admin commission for backward compatibility with
    // existing Booking.hostCommissionPercentage snapshots.
    commissionPercentage,
    hostPercentage: isSubscribed
      ? HOST_COMMISSION.SUBSCRIBED_HOST_PERCENT
      : HOST_COMMISSION.FREE_HOST_PERCENT,
    subscription: summary.activeSubscription || null,
  };
};

const calculateBookingShares = async ({ hostId, totalAmount }) => {
  const profile = await getHostCommercialProfile(hostId);
  const grossAmount = roundMoney(totalAmount);
  const adminShare = roundMoney(
    grossAmount * (profile.commissionPercentage / 100)
  );
  const hostShare = roundMoney(grossAmount - adminShare);

  return {
    ...profile,
    grossAmount,
    adminShare,
    hostShare,
    revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
  };
};

const recordBookingCommission = async ({ booking, payment, apartment, shares }) => {
  return Revenue.findOneAndUpdate(
    { sourceKey: `booking-commission:${payment._id}` },
    {
      $setOnInsert: {
        revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
        amount: shares.adminShare,
        grossAmount: shares.grossAmount,
        hostShare: shares.hostShare,
        adminShare: shares.adminShare,
        booking: booking._id,
        payment: payment._id,
        host: booking.host,
        apartment: booking.apartment,
        city: String(apartment?.location?.city || "").trim(),
        area: String(
          apartment?.location?.area ||
            apartment?.location?.landmark ||
            apartment?.location?.address ||
            ""
        ).trim(),
        currency: booking.pricing?.currency || payment.currency || "INR",
        sourceKey: `booking-commission:${payment._id}`,
        date: payment.paidAt || new Date(),
        metadata: {
          hostTier: shares.hostTier,
          commissionPercentage: shares.commissionPercentage,
          subscriptionId: shares.subscription?._id || null,
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );
};

const recordSubscriptionRevenue = async ({ hostId, payment, subscription }) => {
  return Revenue.findOneAndUpdate(
    { sourceKey: `host-subscription:${payment._id}` },
    {
      $setOnInsert: {
        revenueType: REVENUE_TYPE.HOST_SUBSCRIPTION,
        amount: roundMoney(payment.amount),
        grossAmount: roundMoney(payment.amount),
        hostShare: 0,
        adminShare: roundMoney(payment.amount),
        subscriptionPayment: payment._id,
        host: hostId,
        currency: payment.currency || "INR",
        sourceKey: `host-subscription:${payment._id}`,
        date: payment.paidAt || new Date(),
        metadata: {
          subscriptionId: subscription?._id || null,
          planCode: subscription?.planCode || payment.planCode || "",
          durationMonths: subscription?.durationMonths || payment.durationMonths || 0,
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );
};

module.exports = {
  roundMoney,
  getHostCommercialProfile,
  calculateBookingShares,
  recordBookingCommission,
  recordSubscriptionRevenue,
};