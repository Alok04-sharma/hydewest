const Subscription = require("../models/subscription.model");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
let timer = null;
const processSubscriptionReminders = async () => {
  const now = new Date();
  const max = new Date(now.getTime() + 7 * 86400000);
  const subscriptions = await Subscription.find({ status: "active", expiryDate: { $gt: now, $lte: max }, isDeleted: { $ne: true } });
  for (const subscription of subscriptions) {
    const days = Math.ceil((subscription.expiryDate - now) / 86400000);
    if (![7, 3, 1].includes(days)) continue;
    await createUserNotification({ recipient: subscription.host, type: NOTIFICATION_TYPE.SUBSCRIPTION_PAYMENT_REMINDER, title: `Subscription expires in ${days} day${days > 1 ? "s" : ""}`, message: "Renew now to keep listing creation and editing active.", entityType: "Subscription", entityId: subscription._id, actionUrl: "/host/subscription/plans", eventKey: `subscription-reminder-${subscription._id}-${days}` });
  }
};
const startSubscriptionReminderJob = () => {
  if (timer) return;
  processSubscriptionReminders().catch(console.error);
  timer = setInterval(() => processSubscriptionReminders().catch(console.error), 6 * 60 * 60 * 1000);
};
module.exports = { startSubscriptionReminderJob, processSubscriptionReminders };