const LoyaltyAccount = require("../models/loyaltyAccount.model");
const LoyaltyTransaction = require("../models/loyaltyTransaction.model");
const { LOYALTY_CONFIG, LOYALTY_TRANSACTION_TYPE } = require("../constants/loyalty");

const getOrCreateAccount = async (guestId) =>
  LoyaltyAccount.findOneAndUpdate(
    { guest: guestId, isDeleted: false },
    { $setOnInsert: { guest: guestId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const calculateTier = (lifetimeEarned) => {
  if (lifetimeEarned >= 10000) return "elite";
  if (lifetimeEarned >= 3000) return "traveler";
  return "explorer";
};

const calculatePointsForSpend = (amount, membership = null) => {
  const premiumActive = Boolean(membership);
  const configuredMultiplier = premiumActive
    ? Math.max(Number(membership?.loyaltyMultiplier || 1.5), 1)
    : 1;
  const rate = premiumActive
    ? LOYALTY_CONFIG.FREE_POINTS_PER_100 * configuredMultiplier
    : LOYALTY_CONFIG.FREE_POINTS_PER_100;

  return Math.max(
    Math.floor((Number(amount || 0) / 100) * rate),
    0
  );
};

const calculateRedemption = ({ requestedPoints, balance, amountBeforeLoyalty }) => {
  const normalizedRequested = Math.max(Math.floor(Number(requestedPoints || 0)), 0);
  const available = Math.max(Math.floor(Number(balance || 0)), 0);
  const maxDiscount = Number(amountBeforeLoyalty || 0) * (LOYALTY_CONFIG.MAX_REDEMPTION_PERCENT / 100);
  const maxPointsByAmount = Math.floor(maxDiscount * LOYALTY_CONFIG.POINTS_PER_RUPEE_DISCOUNT);
  const pointsUsed = Math.min(normalizedRequested, available, maxPointsByAmount);
  return {
    pointsUsed,
    discountAmount: pointsUsed / LOYALTY_CONFIG.POINTS_PER_RUPEE_DISCOUNT,
  };
};

const createCredit = async ({ guestId, points, type, referenceKey, booking = null, payment = null, description = "", metadata = {} }) => {
  const existing = await LoyaltyTransaction.findOne({ referenceKey, isDeleted: false });
  if (existing) return existing;

  const account = await getOrCreateAccount(guestId);
  account.balance += points;
  account.lifetimeEarned += points;
  account.tier = calculateTier(account.lifetimeEarned);
  await account.save();

  try {
    return await LoyaltyTransaction.create({
      guest: guestId,
      account: account._id,
      type,
      direction: "credit",
      points,
      balanceAfter: account.balance,
      booking,
      payment,
      referenceKey,
      description,
      metadata,
    });
  } catch (error) {
    account.balance = Math.max(account.balance - points, 0);
    account.lifetimeEarned = Math.max(account.lifetimeEarned - points, 0);
    account.tier = calculateTier(account.lifetimeEarned);
    await account.save();
    if (error?.code === 11000) return LoyaltyTransaction.findOne({ referenceKey });
    throw error;
  }
};

const createDebit = async ({ guestId, points, type, referenceKey, booking = null, payment = null, description = "", metadata = {} }) => {
  const existing = await LoyaltyTransaction.findOne({ referenceKey, isDeleted: false });
  if (existing) return existing;

  const account = await getOrCreateAccount(guestId);
  if (account.balance < points) throw new Error("Insufficient loyalty points balance.");

  account.balance -= points;
  account.lifetimeRedeemed += points;
  await account.save();

  try {
    return await LoyaltyTransaction.create({
      guest: guestId,
      account: account._id,
      type,
      direction: "debit",
      points,
      balanceAfter: account.balance,
      booking,
      payment,
      referenceKey,
      description,
      metadata,
    });
  } catch (error) {
    account.balance += points;
    account.lifetimeRedeemed = Math.max(account.lifetimeRedeemed - points, 0);
    await account.save();
    if (error?.code === 11000) return LoyaltyTransaction.findOne({ referenceKey });
    throw error;
  }
};

const awardBookingPoints = async ({ guestId, booking, payment, points }) => {
  if (!points) return null;
  return createCredit({
    guestId,
    points,
    type: LOYALTY_TRANSACTION_TYPE.BOOKING_REWARD,
    referenceKey: `booking-reward:${booking._id}`,
    booking: booking._id,
    payment: payment?._id || null,
    description: `Reward points for booking ${booking._id}.`,
  });
};

const redeemBookingPoints = async ({ guestId, bookingId, points, discountAmount }) => {
  if (!points) return null;
  return createDebit({
    guestId,
    points,
    type: LOYALTY_TRANSACTION_TYPE.POINTS_REDEMPTION,
    referenceKey: `booking-redemption:${bookingId}`,
    booking: bookingId,
    description: `Loyalty points redeemed for booking ${bookingId}.`,
    metadata: { discountAmount },
  });
};

const restoreBookingRedemption = async ({ guestId, booking, points }) => {
  if (!points) return null;
  return createCredit({
    guestId,
    points,
    type: LOYALTY_TRANSACTION_TYPE.REFUND_RESTORE,
    referenceKey: `booking-redemption-restore:${booking._id}`,
    booking: booking._id,
    description: `Redeemed points restored after booking cancellation.`,
  });
};

const reverseBookingReward = async ({ guestId, booking, points }) => {
  if (!points) return null;
  const existing = await LoyaltyTransaction.findOne({
    referenceKey: `booking-reward-reversal:${booking._id}`,
    isDeleted: false,
  });
  if (existing) return existing;

  const account = await getOrCreateAccount(guestId);
  const reversible = Math.min(points, account.balance);
  if (!reversible) return null;
  account.balance -= reversible;
  account.lifetimeReversed += reversible;
  await account.save();

  return LoyaltyTransaction.create({
    guest: guestId,
    account: account._id,
    type: LOYALTY_TRANSACTION_TYPE.BOOKING_CANCELLATION_REVERSAL,
    direction: "debit",
    points: reversible,
    balanceAfter: account.balance,
    booking: booking._id,
    referenceKey: `booking-reward-reversal:${booking._id}`,
    description: "Booking reward points reversed after cancellation.",
  });
};


const awardReferralPoints = async ({
  guestId,
  referredGuestId,
  points,
  referralCode,
}) => {
  if (!points) return null;

  return createCredit({
    guestId,
    points,
    type: LOYALTY_TRANSACTION_TYPE.REFERRAL_REWARD,
    referenceKey: `referral-reward:${referredGuestId}`,
    description: `Referral reward for code ${referralCode}.`,
    metadata: {
      referredGuestId,
      referralCode,
    },
  });
};

const getLoyaltySummary = async (guestId, page = 1, limit = 20) => {
  const account = await getOrCreateAccount(guestId);
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    LoyaltyTransaction.find({ guest: guestId, isDeleted: false })
      .populate("booking", "checkIn checkOut status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LoyaltyTransaction.countDocuments({ guest: guestId, isDeleted: false }),
  ]);

  return {
    account,
    transactions,
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    config: LOYALTY_CONFIG,
  };
};

module.exports = {
  getOrCreateAccount,
  calculatePointsForSpend,
  calculateRedemption,
  awardBookingPoints,
  redeemBookingPoints,
  restoreBookingRedemption,
  reverseBookingReward,
  getLoyaltySummary,
  awardReferralPoints,
};