const asyncHandler = require("express-async-handler");
const sendResponse = require("../utils/sendResponse");
const {
  generateListingNames,
  improveListingDescription,
} = require("../services/openRouter.service");

const getNameSuggestions = asyncHandler(async (req, res) => {
  const location = String(req.body.location || "").trim();
  const propertyType = String(req.body.propertyType || "").trim();
  const propertyStyle = String(req.body.propertyStyle || "Modern").trim();

  if (!location || !propertyType) {
    return sendResponse(
      res,
      400,
      false,
      "Location and property type are required for name suggestions."
    );
  }

  const suggestions = await generateListingNames({
    location,
    propertyType,
    propertyStyle,
  });

  return sendResponse(
    res,
    200,
    true,
    "Listing name suggestions generated successfully.",
    { suggestions }
  );
});

const improveDescription = asyncHandler(async (req, res) => {
  const description = String(req.body.description || "").trim();
  if (description.length < 30) {
    return sendResponse(
      res,
      400,
      false,
      "Write at least 30 characters before using AI improvement."
    );
  }

  const improvedDescription = await improveListingDescription({
    description,
    location: String(req.body.location || "").trim(),
    propertyType: String(req.body.propertyType || "Property").trim(),
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
  });

  return sendResponse(
    res,
    200,
    true,
    "Description improved successfully.",
    { description: improvedDescription }
  );
});

module.exports = {
  getNameSuggestions,
  improveDescription,
};