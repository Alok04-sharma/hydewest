const Apartment = require("../models/apartment.model");
const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const sendResponse = require("../utils/sendResponse");
const { HOST_COMMISSION } = require("../constants/revenue");
const { getHostSubscriptionSummary } = require("../services/subscription.service");

/**
 * Phase-1 host entitlement middleware.
 *
 * Free hosts can create up to two non-deleted listings and may always edit
 * listings they already own. Subscribed hosts have unlimited listing access.
 */
const activeSubscriptionMiddleware = async (req, res, next) => {
  try {
    if (req.user?.role !== ROLES.HOST && req.user?.isHost !== true) {
      return next();
    }

    const [summary, listingCount] = await Promise.all([
      getHostSubscriptionSummary(req.user._id),
      Apartment.countDocuments({ host: req.user._id, isDeleted: false }),
    ]);

    const isCreateRequest = req.method === "POST";
    const freeListingsRemaining = Math.max(
      HOST_COMMISSION.FREE_LISTING_LIMIT - listingCount,
      0
    );

    const commissionPercentage = summary.isActive
      ? HOST_COMMISSION.SUBSCRIBED_ADMIN_PERCENT
      : HOST_COMMISSION.FREE_ADMIN_PERCENT;

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          freeListingCount: listingCount,
          subscriptionStatus: summary.isActive
            ? "active"
            : summary.status || "none",
          subscriptionExpiry:
            summary.activeSubscription?.expiryDate ||
            summary.latestSubscription?.expiryDate ||
            null,
          commissionPercentage,
        },
      }
    );

    req.hostEntitlement = {
      isSubscribed: Boolean(summary.isActive),
      freeListingLimit: HOST_COMMISSION.FREE_LISTING_LIMIT,
      freeListingCount: listingCount,
      freeListingsRemaining,
      commissionPercentage,
      subscription: summary.activeSubscription || null,
    };

    if (!summary.isActive && isCreateRequest && freeListingsRemaining <= 0) {
      return sendResponse(
        res,
        402,
        false,
        "Free Host listing limit reached. Upgrade your Host subscription to publish unlimited listings.",
        {
          subscriptionRequired: true,
          entitlement: req.hostEntitlement,
        }
      );
    }

    req.subscription = summary.activeSubscription || null;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = activeSubscriptionMiddleware;