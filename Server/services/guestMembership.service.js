const GuestMembership = require("../models/guestMembership.model");

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

module.exports = { getActiveGuestMembership, hasGuestBenefit };