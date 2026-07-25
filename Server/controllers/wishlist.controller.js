const asyncHandler = require("express-async-handler");
const Wishlist = require("../models/wishlist.model");
const Apartment = require("../models/apartment.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");
const { hasGuestBenefit } = require("../services/guestMembership.service");

const FREE_WISHLIST_LIMIT = 30;

const addToWishlist = asyncHandler(async (req, res) => {
  const apartmentId = req.params.apartmentId || req.body.apartmentId;
  const apartment = await Apartment.findOne({
    _id: apartmentId,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  });
  if (!apartment) return sendResponse(res, 404, false, "Approved property not found.");

  let wishlist = await Wishlist.findOne({ user: req.user._id, isDeleted: false });
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, apartments: [] });
  if (wishlist.apartments.some((id) => String(id) === String(apartmentId))) {
    return sendResponse(res, 200, true, "Property is already in your wishlist.", wishlist);
  }

  const unlimited = await hasGuestBenefit(req.user._id, "unlimited_wishlist");
  if (!unlimited && wishlist.apartments.length >= FREE_WISHLIST_LIMIT) {
    return sendResponse(res, 403, false, `Free guests can save up to ${FREE_WISHLIST_LIMIT} properties. Upgrade to Premium for unlimited wishlist.`, { code: "PREMIUM_REQUIRED" });
  }

  wishlist.apartments.push(apartmentId);
  await wishlist.save();
  apartment.wishlistCount = Number(apartment.wishlistCount || 0) + 1;
  await apartment.save();
  await wishlist.populate({ path: "apartments", populate: { path: "host", select: "name avatar" } });
  return sendResponse(res, 200, true, "Property added to wishlist.", wishlist);
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const apartmentId = req.params.apartmentId;
  const wishlist = await Wishlist.findOne({ user: req.user._id, isDeleted: false });
  if (!wishlist) return sendResponse(res, 200, true, "Wishlist is already empty.", []);
  const existed = wishlist.apartments.some((id) => String(id) === String(apartmentId));
  wishlist.apartments = wishlist.apartments.filter((id) => String(id) !== String(apartmentId));
  await wishlist.save();
  if (existed) await Apartment.updateOne({ _id: apartmentId }, { $inc: { wishlistCount: -1 } });
  return sendResponse(res, 200, true, "Property removed from wishlist.", wishlist);
});

const getMyWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id, isDeleted: false }).populate({
    path: "apartments",
    match: { status: APARTMENT_STATUS.APPROVED, isDeleted: false },
    populate: { path: "host", select: "name email avatar" },
  });
  const unlimited = await hasGuestBenefit(req.user._id, "unlimited_wishlist");
  return sendResponse(res, 200, true, "Wishlist fetched successfully.", {
    apartments: wishlist?.apartments || [],
    count: wishlist?.apartments?.length || 0,
    limit: unlimited ? null : FREE_WISHLIST_LIMIT,
    unlimited,
  });
});

module.exports = { addToWishlist, removeFromWishlist, getMyWishlist };