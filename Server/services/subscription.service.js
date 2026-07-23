const Apartment = require("../models/apartment.model");
const Subscription = require("../models/subscription.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const {
  SUBSCRIPTION_STATUS,
} = require("../constants/subscriptionStatus");
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

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
};

const getRemainingTime = (expiryDate, now = new Date()) => {
  if (!expiryDate) {
    return {
      remainingMilliseconds: 0,
      remainingDays: 0,
      remainingHours: 0,
      isExpired: true,
    };
  }

  const remainingMilliseconds = Math.max(
    new Date(expiryDate).getTime() - now.getTime(),
    0
  );

  return {
    remainingMilliseconds,
    remainingDays: Math.ceil(remainingMilliseconds / (24 * 60 * 60 * 1000)),
    remainingHours: Math.ceil(remainingMilliseconds / (60 * 60 * 1000)),
    isExpired: remainingMilliseconds <= 0,
  };
};

const markHostListingsInactive = async (hostId, reason) => {
  const listings = await Apartment.find({
    host: hostId,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  });

  if (!listings.length) {
    return 0;
  }

  const changedAt = new Date();

  for (const listing of listings) {
    listing.status = APARTMENT_STATUS.INACTIVE;
    listing.isFeatured = false;

    if (!Array.isArray(listing.statusHistory)) {
      listing.statusHistory = [];
    }

    listing.statusHistory.push({
      status: APARTMENT_STATUS.INACTIVE,
      action: "subscription_expired",
      reason,
      changedBy: null,
      changedAt,
    });

    await listing.save();
  }

  return listings.length;
};

const refreshHostSubscriptions = async (hostId, now = new Date()) => {
  const subscriptions = await Subscription.find({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
    status: {
      $in: [
        SUBSCRIPTION_STATUS.ACTIVE,
        SUBSCRIPTION_STATUS.SCHEDULED,
      ],
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
      subscription.expiredAt = now;
      changed = true;
      await subscription.save();
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

  return {
    activeSubscription,
    changed,
  };
};

const getHostSubscriptionSummary = async (hostId) => {
  const now = new Date();
  const { activeSubscription } = await refreshHostSubscriptions(hostId, now);

  const latestPaidSubscription = await Subscription.findOne({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
  }).sort({ expiryDate: -1, createdAt: -1 });

  const upcomingSubscription = await Subscription.findOne({
    host: hostId,
    isDeleted: false,
    paymentStatus: "success",
    status: SUBSCRIPTION_STATUS.SCHEDULED,
    expiryDate: { $gt: now },
  }).sort({ startDate: 1 });

  const referenceSubscription = activeSubscription || latestPaidSubscription;
  const remaining = getRemainingTime(referenceSubscription?.expiryDate, now);

  return {
    isActive: Boolean(activeSubscription),
    status: activeSubscription
      ? SUBSCRIPTION_STATUS.ACTIVE
      : referenceSubscription?.status || "none",
    activeSubscription,
    latestSubscription: latestPaidSubscription,
    upcomingSubscription,
    nextRenewalDate: activeSubscription?.expiryDate || null,
    ...remaining,
  };
};

const expireSubscriptions = async () => {
  const now = new Date();

  const expiredCandidates = await Subscription.find({
    isDeleted: false,
    paymentStatus: "success",
    status: {
      $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.SCHEDULED],
    },
    expiryDate: { $lte: now },
  }).populate("host", "name email");

  const processedHosts = new Set();

  for (const subscription of expiredCandidates) {
    subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
    subscription.expiredAt = subscription.expiredAt || now;
    await subscription.save();

    processedHosts.add(String(subscription.host?._id || subscription.host));
  }

  /*
   * Backward compatibility:
   *
   * Old expired records may already have the Super Admin notification
   * timestamp but no Host notification timestamp. Add those Hosts to this
   * run so the missing Host alert is generated after this update.
   */
  const unnotifiedExpiredHostIds = await Subscription.distinct("host", {
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

  unnotifiedExpiredHostIds.forEach((hostId) => {
    processedHosts.add(String(hostId));
  });

  for (const hostId of processedHosts) {
    const { activeSubscription } = await refreshHostSubscriptions(hostId, now);

    /*
     * A scheduled renewal may have become active at the same instant.
     * In that case coverage did not end, so no expiry warning is required.
     */
    if (activeSubscription) {
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

    if (!lastExpired) {
      continue;
    }

    const hostName =
      lastExpired.host?.name ||
      lastExpired.host?.email ||
      "Host";

    await markHostListingsInactive(
      hostId,
      "Host subscription expired. Listing requires an active subscription and fresh review."
    );

    if (!lastExpired.expiryNotifiedAt) {
      await createAdminNotifications({
        type: NOTIFICATION_TYPE.SUBSCRIPTION_EXPIRED,
        title: "Host subscription expired",
        message: `${hostName}'s ${lastExpired.planName} subscription has expired.`,
        actor: lastExpired.host?._id || hostId,
        entityType: "Subscription",
        entityId: lastExpired._id,
        actionUrl: "/owner/subscriptions",
        eventKey: `subscription-expired:${lastExpired._id}`,
        metadata: {
          hostId,
          planCode: lastExpired.planCode,
          expiryDate: lastExpired.expiryDate,
        },
      });

      lastExpired.expiryNotifiedAt = now;
      await lastExpired.save();
    }

    if (!lastExpired.hostExpiryNotifiedAt) {
      await createUserNotification({
        recipient: lastExpired.host?._id || hostId,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_EXPIRED,
        title: "Your Host subscription has expired",
        message: `Your ${lastExpired.planName} plan expired on ${new Date(
          lastExpired.expiryDate
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}. Renew your subscription to create or edit listings. Approved listings have been moved to inactive status.`,
        actor: null,
        entityType: "Subscription",
        entityId: lastExpired._id,
        actionUrl: "/host/subscription/plans",
        eventKey: `host-subscription-expired:${lastExpired._id}`,
        metadata: {
          hostId,
          planCode: lastExpired.planCode,
          planName: lastExpired.planName,
          expiryDate: lastExpired.expiryDate,
          subscriptionId: lastExpired._id,
        },
      });

      lastExpired.hostExpiryNotifiedAt = now;
      await lastExpired.save();
    }
  }

  // Enforce subscription requirement for legacy hosts that have approved
  // listings but have never purchased an active subscription.
  const approvedListingHostIds = await Apartment.distinct("host", {
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  });

  for (const hostId of approvedListingHostIds) {
    const hostKey = String(hostId);
    const { activeSubscription } = await refreshHostSubscriptions(hostId, now);

    if (!activeSubscription) {
      await markHostListingsInactive(
        hostId,
        "Active Host subscription required. Listing moved to inactive status."
      );
      processedHosts.add(hostKey);
    }
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
};