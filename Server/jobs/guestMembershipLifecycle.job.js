const GuestMembership = require("../models/guestMembership.model");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");

let timer = null;

const processGuestMembershipLifecycle = async () => {
  const now = new Date();
  const memberships = await GuestMembership.find({
    status: "active",
    expiryDate: { $ne: null },
    isDeleted: false,
  });

  for (const membership of memberships) {
    const expiry = new Date(membership.expiryDate);
    if (expiry <= now) {
      membership.status = "expired";
      membership.expiredAt = now;
      await membership.save();
      await createUserNotification({
        recipient: membership.guest,
        type: NOTIFICATION_TYPE.GUEST_MEMBERSHIP_EXPIRED,
        title: "Premium membership expired",
        message: "Your Guest Premium benefits have expired. Renew to restore discounts, chat, unlimited wishlist and rewards.",
        entityType: "GuestMembership",
        entityId: membership._id,
        actionUrl: "/guest/premium",
        eventKey: `guest-membership-expired:${membership._id}:${expiry.toISOString()}`,
      });
      continue;
    }

    const remainingDays = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
    if ([7, 3, 1].includes(remainingDays)) {
      await createUserNotification({
        recipient: membership.guest,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_PAYMENT_REMINDER,
        title: `Premium expires in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`,
        message: "Renew your Guest Premium plan to keep all member benefits active.",
        entityType: "GuestMembership",
        entityId: membership._id,
        actionUrl: "/guest/premium",
        eventKey: `guest-membership-reminder:${membership._id}:${remainingDays}:${expiry.toISOString()}`,
      });
    }
  }
};

const startGuestMembershipLifecycleJob = () => {
  if (timer) return;
  processGuestMembershipLifecycle().catch(console.error);
  timer = setInterval(() => processGuestMembershipLifecycle().catch(console.error), 6 * 60 * 60 * 1000);
};

module.exports = { startGuestMembershipLifecycleJob, processGuestMembershipLifecycle };