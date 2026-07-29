const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Apartment = require("../models/apartment.model");
const sendResponse = require("../utils/sendResponse");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
const { generateRatesFromDailyPrice } = require("../constants/pricingPresets");
const {
  generateListingNames,
  improveListingDescription,
} = require("../services/openRouter.service");
const { generateAiPriceSuggestion } = require("../services/aiPriceSuggestion.service");

const getNameSuggestions = asyncHandler(async (req, res) => {
  const location = String(req.body.location || "").trim();
  const propertyType = String(req.body.propertyType || "").trim();
  const propertyStyle = String(req.body.propertyStyle || "Modern").trim();

  if (!location || !propertyType) {
    return sendResponse(res, 400, false, "Location and property type are required for name suggestions.");
  }

  const suggestions = await generateListingNames({ location, propertyType, propertyStyle });
  return sendResponse(res, 200, true, "Listing name suggestions generated successfully.", { suggestions });
});

const improveDescription = asyncHandler(async (req, res) => {
  const description = String(req.body.description || "").trim();
  if (description.length < 30) {
    return sendResponse(res, 400, false, "Write at least 30 characters before using AI improvement.");
  }

  const improvedDescription = await improveListingDescription({
    description,
    location: String(req.body.location || "").trim(),
    propertyType: String(req.body.propertyType || "Property").trim(),
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
  });

  return sendResponse(res, 200, true, "Description improved successfully.", { description: improvedDescription });
});

const createPriceSuggestion = asyncHandler(async (req, res) => {
  const listingId = req.body.listingId || req.params.id || null;
  let apartment = null;
  let basePrice = Number(req.body.basePrice || 0);
  let location = req.body.location || {};

  if (listingId) {
    if (!mongoose.isValidObjectId(listingId)) return sendResponse(res, 400, false, "Invalid listing ID.");
    apartment = await Apartment.findOne({ _id: listingId, host: req.user._id, isDeleted: false });
    if (!apartment) return sendResponse(res, 404, false, "Listing not found.");
    basePrice = Number(req.body.basePrice || apartment.pricing?.rates?.day || apartment.pricing?.basePrice || 0);
    location = apartment.location || location;
  }

  const suggestion = await generateAiPriceSuggestion({ basePrice, location });
  if (!apartment) {
    return sendResponse(res, 200, true, "AI price suggestion generated. The Host remains in control.", {
      ...suggestion,
      persisted: false,
    });
  }

  apartment.aiPriceSuggestions.push({
    currentPrice: basePrice,
    suggestedPrice: suggestion.suggestedPrice,
    reason: suggestion.reason,
    context: suggestion.context,
    status: "pending",
  });
  await apartment.save({ validateModifiedOnly: true });
  const savedSuggestion = apartment.aiPriceSuggestions.at(-1);

  await createUserNotification({
    recipient: req.user._id,
    type: NOTIFICATION_TYPE.AI_PRICE_SUGGESTION,
    title: "AI Price Suggestion",
    message: `Current reference price ₹${basePrice.toLocaleString("en-IN")}. Suggested reference price ₹${suggestion.suggestedPrice.toLocaleString("en-IN")}. ${suggestion.reason}`,
    entityType: "Apartment",
    entityId: apartment._id,
    actionUrl: `/host/listings?priceSuggestion=${savedSuggestion._id}&listing=${apartment._id}`,
    metadata: { listingId: apartment._id, suggestionId: savedSuggestion._id, currentPrice: basePrice, suggestedPrice: suggestion.suggestedPrice, reason: suggestion.reason },
    eventKey: `ai-price-suggestion:${apartment._id}:${savedSuggestion._id}`,
  });

  return sendResponse(res, 201, true, "AI price suggestion created. Accept or reject it from the Host workspace.", {
    ...savedSuggestion.toObject(),
    persisted: true,
  });
});

const resolvePriceSuggestion = asyncHandler(async (req, res) => {
  const { id, suggestionId } = req.params;
  const decision = String(req.body.decision || "").toLowerCase();
  if (!["accept", "reject"].includes(decision)) return sendResponse(res, 400, false, "Decision must be accept or reject.");

  const apartment = await Apartment.findOne({ _id: id, host: req.user._id, isDeleted: false });
  if (!apartment) return sendResponse(res, 404, false, "Listing not found.");
  const suggestion = apartment.aiPriceSuggestions.id(suggestionId);
  if (!suggestion || suggestion.status !== "pending") return sendResponse(res, 404, false, "Pending price suggestion not found.");

  if (decision === "accept") {
    const rates = generateRatesFromDailyPrice(Number(suggestion.suggestedPrice), apartment.pricing?.rates || {});
    if (Number(apartment.policies?.minBookingDays || 1) > 1) rates.hour = 0;
    apartment.pricing.rates = rates;
    apartment.pricing.basePrice = rates.night;
    apartment.pricing.pricePerNight = rates.night;
    apartment.pricing.autoRateMultipliers = true;
    apartment.priceHistory.push({ amount: rates.night, priceUnit: "night", recordedAt: new Date() });
    suggestion.status = "accepted";
  } else {
    suggestion.status = "rejected";
  }
  suggestion.resolvedAt = new Date();
  await apartment.save({ validateModifiedOnly: true });

  return sendResponse(res, 200, true, decision === "accept" ? "AI suggestion accepted and listing prices updated." : "AI suggestion rejected. Current pricing was kept.", {
    suggestion,
    pricing: apartment.pricing,
  });
});

module.exports = {
  getNameSuggestions,
  improveDescription,
  createPriceSuggestion,
  resolvePriceSuggestion,
};
