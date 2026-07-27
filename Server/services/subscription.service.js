const Apartment = require("../models/apartment.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const { SUBSCRIPTION_STATUS } = require("../constants/subscriptionStatus");
const { HOST_COMMISSION } = require("../constants/revenue");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const {
  createAdminNotifications,
  createUserNotification,
} = require("./notification.service");

const addMonthsUTC = (date, months) => {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
};

const getRemainingTime = (expiryDate, now = new Date()) => {
  const remainingMilliseconds = expiryDate
    ? Math.max(new Date(expiryDate).getTime() - now.getTime(), 0)
    : 0;

  return {
    remainingMilliseconds,
    remainingDays: Math.ceil(remainingMilliseconds / 86400000),
    remainingHours: Math.ceil(remainingMilliseconds / 3600000),
    isExpired: remainingMilliseconds <= 0,
  };
};

/**
 * When a subscription expires the Host becomes a Free Host. We never remove
 * their data. The first two approved listings remain public and any additional
 * approved listings are moved to inactive status until the Host subscribes
 * again or removes listings to fit the free allowance.
 */
const enforceFreeHostListingLimit = async (hostId, reason) => {
  const approvedListings = await Apartment.find({
    host: hostId,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  }).sort({ createdAt: 1, _id: 1 });

  const excess = approvedListings.slice(HOST_COMMISSION.FREE_LISTING_LIMIT);
  if (!excess.length) return 0;

  const changedAt = new Date();
  for (const listing of excess) {
    await Apartment.updateOne(
      { _id: listing._id },
      {
        $set: {
          status: APARTMENT_STATUS.INACTIVE,
          isFeatured: false,
        },
        $push: {
          statusHistory: {
            status: APARTMENT_STATUS.INACTIVE,
            action: "free_listing_limit_enforced",
            reason,
            changedBy: null,
            changedAt,
          },
        },
      }
    );
  }

  return excess.length;
};

// Backward-compatible exported name used by older jobs/controllers.
const markHostListingsInactive = enforceFreeHostListingLimit;

const syncHostCommercialProfile = async (hostId, activeSubscription, fallbackStatus = "none") => {
  const freeListingCount = await Apartment.countDocuments({
    host: hostId,
    isDeleted: false,
  });

  await User.updateOne(
    { _id: hostId },
    {
      $set: {
        subscriptionStatus: activeSubscription ? "active" : fallbackStatus,
        subscriptionExpiry: activeSubscription?.expiryDate || null,
        freeListingCount,
        commissionPercentage: activeSubscription
          ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
          : HOST_COMMISSION.FREE_ADMIN_PERCENT,
      },
    }
  );

  return freeListingCount;
};

const refreshHostSubscriptions = async (hostId, now = new Date()) => {
  const subscriptions = await Subscription.find({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.SCHEDULED],
    },
  }).sort({ startDate: 1, expiryDate: 1 });

  let changed = false;
  for (const subscription of subscriptions) {
    if (
      subscription.expiryDate &&
      new Date(subscription.expiryDate).getTime() <= now.getTime() &&
      subscription.status !== SUBSCRIPTION_STATUS.EXPIRED
    ) {
      subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
      subscription.expiredAt = subscription.expiredAt || now;
      await subscription.save();
      changed = true;
    }
  }

  const scheduledReady = await Subscription.findOne({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
    status: SUBSCRIPTION_STATUS.SCHEDULED,
    startDate: { $lte: now },
    expiryDate: { $gt: now },
  }).sort({ startDate: 1 });

  if (scheduledReady) {
    scheduledReady.status = SUBSCRIPTION_STATUS.ACTIVE;
    scheduledReady.activatedAt = scheduledReady.activatedAt || now;
    await scheduledReady.save();
    changed = true;
  }

  const activeSubscription = await Subscription.findOne({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
    status: SUBSCRIPTION_STATUS.ACTIVE,
    startDate: { $lte: now },
    expiryDate: { $gt: now },
  })
    .sort({ expiryDate: -1 })
    .populate("payment");

  return { activeSubscription, changed };
};

const getHostSubscriptionSummary = async (hostId) => {
  const now = new Date();
  const { activeSubscription } = await refreshHostSubscriptions(hostId, now);

  const [latestPaidSubscription, upcomingSubscription, freeListingCount] =
    await Promise.all([
      Subscription.findOne({
        host: hostId,
        isDeleted: false,
        paymentStatus: "success",
      }).sort({ expiryDate: -1, createdAt: -1 }),
      Subscription.findOne({
        host: hostId,
        isDeleted: false,
        paymentStatus: "success",
        status: SUBSCRIPTION_STATUS.SCHEDULED,
        expiryDate: { $gt: now },
      }).sort({ startDate: 1 }),
      Apartment.countDocuments({ host: hostId, isDeleted: false }),
    ]);

  const referenceSubscription = activeSubscription || latestPaidSubscription;
  const status = activeSubscription
    ? SUBSCRIPTION_STATUS.ACTIVE
    : referenceSubscription?.status || "none";
  const remaining = getRemainingTime(referenceSubscription?.expiryDate, now);
  const isActive = Boolean(activeSubscription);
  const freeListingsRemaining = Math.max(
    HOST_COMMISSION.FREE_LISTING_LIMIT - freeListingCount,
    0
  );

  await User.updateOne(
    { _id: hostId },
    {
      $set: {
        subscriptionStatus: status,
        subscriptionExpiry: activeSubscription?.expiryDate || referenceSubscription?.expiryDate || null,
        freeListingCount,
        commissionPercentage: isActive
          ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
          : HOST_COMMISSION.FREE_ADMIN_PERCENT,
      },
    }
  );

  return {
    isActive,
    status,
    activeSubscription,
    latestSubscription: latestPaidSubscription,
    upcomingSubscription,
    nextRenewalDate: activeSubscription?.expiryDate || null,
    hostTier: isActive ? "subscribed" : "free",
    commissionPercentage: isActive
      ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
      : HOST_COMMISSION.FREE_ADMIN_PERCENT,
    hostRevenuePercentage: isActive ? 90 : 70,
    freeListingLimit: HOST_COMMISSION.FREE_LISTING_LIMIT,
    freeListingCount,
    freeListingsRemaining,
    canCreateListing: isActive || freeListingsRemaining > 0,
    ...remaining,
  };
};

const expireSubscriptions = async () => {
  const now = new Date();
  const expiredCandidates = await Subscription.find({
    isDeleted: false,
    paymentStatus: "success",
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.SCHEDULED] },
    expiryDate: { $lte: now },
  }).populate("host", "name email");

  const processedHosts = new Set();
  for (const subscription of expiredCandidates) {
    subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
    subscription.expiredAt = subscription.expiredAt || now;
    await subscription.save();
    processedHosts.add(String(subscription.host?._id || subscription.host));
  }

  const unnotifiedHostIds = await Subscription.distinct("host", {
    isDeleted: false,
    paymentStatus: "success",
    status: SUBSCRIPTION_STATUS.EXPIRED,
    $or: [
      { expiryNotifiedAt: null },
      { expiryNotifiedAt: { $exists: false } },
      { hostExpiryNotifiedAt: null },
      { hostExpiryNotifiedAt: { $exists: false } },
    ],
  });
  unnotifiedHostIds.forEach((hostId) => processedHosts.add(String(hostId)));

  for (const hostId of processedHosts) {
    const { activeSubscription } = await refreshHostSubscriptions(hostId, now);
    if (activeSubscription) {
      await syncHostCommercialProfile(hostId, activeSubscription, "active");
      continue;
    }

    const lastExpired = await Subscription.findOne({
      host: hostId,
      isDeleted: false,
      paymentStatus: "success",
      status: SUBSCRIPTION_STATUS.EXPIRED,
    })
      .sort({ expiryDate: -1 })
      .populate("host", "name email");

    if (!lastExpired) continue;

    await enforceFreeHostListingLimit(
      hostId,
      "Host subscription expired. The free Host plan keeps up to two approved listings active."
    );
    await syncHostCommercialProfile(hostId, null, SUBSCRIPTION_STATUS.EXPIRED);

    const hostName = lastExpired.host?.name || lastExpired.host?.email || "Host";
    if (!lastExpired.expiryNotifiedAt) {
      await createAdminNotifications({
        type: NOTIFICATION_TYPE.SUBSCRIPTION_EXPIRED,
        title: "Host subscription expired",
        message: `${hostName}'s ${lastExpired.planName} subscription has expired. The account now follows Free Host limits.`,
        actor: lastExpired.host?._id || hostId,
        entityType: "Subscription",
        entityId: lastExpired._id,
        actionUrl: "/owner/subscriptions",
        eventKey: `subscription-expired:${lastExpired._id}`,
        metadata: { hostId, planCode: lastExpired.planCode, expiryDate: lastExpired.expiryDate },
      });
      lastExpired.expiryNotifiedAt = now;
    }

    if (!lastExpired.hostExpiryNotifiedAt) {
      await createUserNotification({
        recipient: lastExpired.host?._id || hostId,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_EXPIRED,
        title: "Your Host subscription has expired",
        message:
          "Your account is now on the Free Host plan. You can keep up to two listings active and receive 70% of each paid booking. Renew to unlock unlimited listings and a 90% Host share.",
        actor: null,
        entityType: "Subscription",
        entityId: lastExpired._id,
        actionUrl: "/host/subscription/plans",
        eventKey: `host-subscription-expired:${lastExpired._id}`,
        metadata: { hostId, planCode: lastExpired.planCode, expiryDate: lastExpired.expiryDate },
      });
      lastExpired.hostExpiryNotifiedAt = now;
    }

    await lastExpired.save();
  }

  return {
    expiredSubscriptions: expiredCandidates.length,
    processedHosts: processedHosts.size,
  };
};

module.exports = {
  addMonthsUTC,
  getRemainingTime,
  getHostSubscriptionSummary,
  refreshHostSubscriptions,
  expireSubscriptions,
  markHostListingsInactive,
  enforceFreeHostListingLimit,
  syncHostCommercialProfile,
};