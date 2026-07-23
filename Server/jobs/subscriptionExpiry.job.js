const { expireSubscriptions } = require("../services/subscription.service");

const ONE_HOUR = 60 * 60 * 1000;

const runSubscriptionExpiryJob = async () => {
  try {
    const result = await expireSubscriptions();

    if (result.expiredSubscriptions > 0) {
      console.log(
        `[Subscription Job] Expired ${result.expiredSubscriptions} subscription(s) across ${result.processedHosts} host(s).`
      );
    }
  } catch (error) {
    console.error("[Subscription Job] Failed:", error.message);
  }
};

const startSubscriptionExpiryJob = () => {
  runSubscriptionExpiryJob();

  const timer = setInterval(runSubscriptionExpiryJob, ONE_HOUR);
  timer.unref?.();

  return timer;
};

module.exports = {
  runSubscriptionExpiryJob,
  startSubscriptionExpiryJob,
};
