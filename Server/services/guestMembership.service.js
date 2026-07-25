const GuestMembership = require("../models/guestMembership.model");
const { getGuestMembershipPlans } = require("../constants/guestMembershipPlans");

const getActiveGuestMembership = (guestId, at = new Date()) =>
  GuestMembership.findOne({
    guest: guestId,
    status: "active",
    expiryDate: { $gt: at },
    isDeleted: false,
  }).lean();

const hasGuestBenefit = async (guestId, benefit) => {
  const membership = await getActiveGuestMembership(guestId);
  return Boolean(membership && membership.benefits.includes(benefit));
};

const getGuestMembershipSummary = async (guestId) => {
  const now = new Date();
  let membership = await GuestMembership.findOne({ guest: guestId, isDeleted: false })
    .populate("payment")
    .lean();

  if (membership?.status === "active" && membership.expiryDate && new Date(membership.expiryDate) <= now) {
    await GuestMembership.updateOne(
      { _id: membership._id },
      { $set: { status: "expired", expiredAt: now } }
    );
    membership = { ...membership, status: "expired", expiredAt: now };
  }

  const isActive = Boolean(
    membership?.status === "active" &&
      membership?.expiryDate &&
      new Date(membership.expiryDate) > now
  );

  const remainingMs = isActive ? new Date(membership.expiryDate).getTime() - now.getTime() : 0;

  return {
    membership,
    isActive,
    remainingMilliseconds: Math.max(remainingMs, 0),
    remainingDays: Math.max(Math.ceil(remainingMs / (24 * 60 * 60 * 1000)), 0),
    plans: getGuestMembershipPlans(),
  };
};

module.exports = {
  getActiveGuestMembership,
  hasGuestBenefit,
  getGuestMembershipSummary,
};