const ROLES = require("../constants/roles");
const sendResponse = require("../utils/sendResponse");
const {
  getHostSubscriptionSummary,
} = require("../services/subscription.service");

const activeSubscriptionMiddleware = async (req, res, next) => {
  try {
    if (req.user?.role !== ROLES.HOST && req.user?.isHost !== true) {
      return next();
    }

    const summary = await getHostSubscriptionSummary(req.user._id);

    if (!summary.isActive) {
      return sendResponse(
        res,
        402,
        false,
        "Active subscription required. Please purchase or renew a Host plan to create or edit listings.",
        {
          subscriptionRequired: true,
          subscription: summary,
        }
      );
    }

    req.subscription = summary.activeSubscription;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = activeSubscriptionMiddleware;