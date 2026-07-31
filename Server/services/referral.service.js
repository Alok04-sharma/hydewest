const crypto = require("crypto");

const Referral = require("../models/referral.model");
const { LOYALTY_CONFIG } = require("../constants/loyalty");
const { hasGuestBenefit } = require("./guestMembership.service");
const { awardReferralPoints } = require("./loyalty.service");

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const createCode = (guest) => {
  const name = String(guest?.name || "GUEST")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5)
    .toUpperCase();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `HYDE${name || "GUEST"}${suffix}`;
};

const getOrCreateReferral = async (guest) => {
  let referral = await Referral.findOne({
    inviter: guest._id,
    isDeleted: false,
  });

  if (referral) return referral;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      referral = await Referral.create({
        inviter: guest._id,
        code: createCode(guest),
      });
      return referral;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  throw new Error("Referral code could not be generated.");
};

const trackReferralVisit = async (code) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  return Referral.findOneAndUpdate(
    { code: normalizedCode, isDeleted: false },
    {
      $inc: { clicks: 1 },
      $set: { lastClickedAt: new Date() },
    },
    { returnDocument: "after" }
  );
};

const processReferralRegistration = async ({ code, guest }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode || !guest?._id) return null;

  const referral = await Referral.findOne({
    code: normalizedCode,
    isDeleted: false,
  });

  if (!referral || String(referral.inviter) === String(guest._id)) {
    return null;
  }

  const alreadyConverted = referral.conversions.some(
    (item) => String(item.guest) === String(guest._id)
  );
  if (alreadyConverted) return referral;

  const isEligibleInviter = await hasGuestBenefit(
    referral.inviter,
    "referral_credits"
  );

  const rewardPoints = isEligibleInviter
    ? LOYALTY_CONFIG.REFERRAL_REWARD_POINTS
    : 0;

  const conversion = {
    guest: guest._id,
    email: guest.email,
    status: rewardPoints > 0 ? "rewarded" : "registered",
    rewardPoints,
    joinedAt: new Date(),
    rewardedAt: rewardPoints > 0 ? new Date() : null,
  };

  referral.conversions.push(conversion);
  referral.totalRewardPoints += rewardPoints;
  await referral.save();

  if (rewardPoints > 0) {
    await awardReferralPoints({
      guestId: referral.inviter,
      referredGuestId: guest._id,
      points: rewardPoints,
      referralCode: referral.code,
    });
  }

  return referral;
};

const getReferralSummary = async (guest) => {
  const referral = await getOrCreateReferral(guest);
  await referral.populate("conversions.guest", "name email avatar createdAt");

  return {
    code: referral.code,
    clicks: referral.clicks,
    conversions: referral.conversions,
    conversionCount: referral.conversions.length,
    rewardedCount: referral.conversions.filter(
      (item) => item.status === "rewarded"
    ).length,
    totalRewardPoints: referral.totalRewardPoints,
    rewardPointsPerReferral: LOYALTY_CONFIG.REFERRAL_REWARD_POINTS,
    pointsPerRupee: LOYALTY_CONFIG.POINTS_PER_RUPEE_DISCOUNT,
  };
};

module.exports = {
  getOrCreateReferral,
  getReferralSummary,
  processReferralRegistration,
  trackReferralVisit,
};