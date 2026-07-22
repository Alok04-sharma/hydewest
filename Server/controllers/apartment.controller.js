const asyncHandler = require("express-async-handler");
const Apartment = require("../models/apartment.model");
const sendResponse = require("../utils/sendResponse");
const generateUniqueSlug = require("../utils/generateSlug");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// ======================================
// Create Apartment
// ======================================
const createApartment = asyncHandler(async (req, res) => {
  const hostId = req.user?._id || req.user?.id;

  if (!hostId) {
    return sendResponse(res, 401, false, "Unauthorized. Host user ID missing.");
  }

  const apartmentData = req.body;

  // Generate Slug
  const slug = await generateUniqueSlug(apartmentData.title);

  // Upload Images
  let uploadedImages = [];

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const image = await uploadToCloudinary(
        file.buffer,
        "StayNest/Apartments"
      );
      uploadedImages.push(image);
    }
  }

  const apartment = await Apartment.create({
    ...apartmentData,
    slug,
    host: hostId,
    images: uploadedImages,
    status: "pending",
  });

  return sendResponse(
    res,
    201,
    true,
    "Apartment created successfully and waiting for approval.",
    apartment
  );
});

// ======================================
// Get All Approved Apartments
// ======================================
const getAllApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    status: "approved",
    isDeleted: false,
  })
    .populate("host", "name email avatar")
    .sort({
      createdAt: -1,
    });

  return sendResponse(
    res,
    200,
    true,
    "Apartments fetched successfully.",
    apartments
  );
});

// ======================================
// Get Single Apartment
// ======================================
const getApartmentDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const apartment = await Apartment.findOne({
    _id: id,
    isDeleted: false,
  }).populate("host", "name email avatar");

  if (!apartment) {
    return sendResponse(res, 404, false, "Apartment not found.");
  }

  return sendResponse(
    res,
    200,
    true,
    "Apartment details fetched successfully.",
    apartment
  );
});

// ======================================
// Get Host Apartments (CRASH FIX INCLUDED)
// ======================================
const getHostApartments = asyncHandler(async (req, res) => {
  const hostId = req.user?._id || req.user?.id;

  if (!hostId) {
    return sendResponse(
      res,
      401,
      false,
      "Unauthorized. Authentication token or user missing."
    );
  }

  const apartments = await Apartment.find({
    host: hostId,
    isDeleted: false,
  }).sort({
    createdAt: -1,
  });

  return sendResponse(
    res,
    200,
    true,
    "Host apartments fetched successfully.",
    apartments
  );
});

// ======================================
// Update Apartment
// ======================================
const updateApartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hostId = req.user?._id || req.user?.id;

  const apartment = await Apartment.findOne({
    _id: id,
    host: hostId,
    isDeleted: false,
  });

  if (!apartment) {
    return sendResponse(
      res,
      404,
      false,
      "Apartment not found or unauthorized."
    );
  }

  Object.assign(apartment, req.body);
  await apartment.save();

  return sendResponse(
    res,
    200,
    true,
    "Apartment updated successfully.",
    apartment
  );
});

// ======================================
// Soft Delete Apartment
// ======================================
const deleteApartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hostId = req.user?._id || req.user?.id;

  const apartment = await Apartment.findOne({
    _id: id,
    host: hostId,
  });

  if (!apartment) {
    return sendResponse(res, 404, false, "Apartment not found.");
  }

  apartment.isDeleted = true;
  apartment.status = "inactive";

  await apartment.save();

  return sendResponse(res, 200, true, "Apartment deleted successfully.");
});

// ======================================
// Advanced Search Apartments
// ======================================
const searchApartments = asyncHandler(async (req, res) => {
  const {
    city,
    state,
    country,
    minPrice,
    maxPrice,
    guests,
    bedrooms,
    propertyType,
    amenities,
    minRating,
    sortBy = "newest",
    page = 1,
    limit = 10,
  } = req.query;

  let query = {
    status: "approved",
    isDeleted: false,
  };

  // Location Filter
  if (city) {
    query["location.city"] = { $regex: city, $options: "i" };
  }
  if (state) {
    query["location.state"] = { $regex: state, $options: "i" };
  }
  if (country) {
    query["location.country"] = { $regex: country, $options: "i" };
  }

  // Price Filter
  if (minPrice || maxPrice) {
    query["pricing.pricePerNight"] = {};
    if (minPrice) query["pricing.pricePerNight"].$gte = Number(minPrice);
    if (maxPrice) query["pricing.pricePerNight"].$lte = Number(maxPrice);
  }

  // Guest Filter
  if (guests) {
    query.guests = { $gte: Number(guests) };
  }

  // Bedroom Filter
  if (bedrooms) {
    query.bedrooms = { $gte: Number(bedrooms) };
  }

  // Property Type
  if (propertyType) {
    query.propertyType = propertyType;
  }

  // Amenities
  if (amenities) {
    query.amenities = { $all: amenities.split(",") };
  }

  // Rating Filter
  if (minRating) {
    query.rating = { $gte: Number(minRating) };
  }

  // Sorting
  let sort = {};
  switch (sortBy) {
    case "price_low":
      sort = { "pricing.pricePerNight": 1 };
      break;
    case "price_high":
      sort = { "pricing.pricePerNight": -1 };
      break;
    case "rating":
      sort = { rating: -1 };
      break;
    case "popular":
      sort = { bookingCount: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  const total = await Apartment.countDocuments(query);

  const apartments = await Apartment.find(query)
    .populate("host", "name email avatar")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  return sendResponse(res, 200, true, "Apartments fetched successfully.", {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
    apartments,
  });
});

// ======================================
// Export
// ======================================
module.exports = {
  createApartment,
  getAllApartments,
  getApartmentDetails,
  getHostApartments,
  updateApartment,
  deleteApartment,
  searchApartments,
};