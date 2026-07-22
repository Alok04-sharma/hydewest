const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");

const APARTMENT_STATUS = require("../constants/apartmentStatus");

const sendResponse = require("../utils/sendResponse");

// ======================================
// Host Dashboard Stats
// ======================================

const getDashboardStats = asyncHandler(async (req, res) => {
  const hostId = req.user._id;

  const [
    totalApartments,
    pending,
    approved,
    rejected,
    inactive,
  ] = await Promise.all([
    Apartment.countDocuments({
      host: hostId,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.PENDING,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.APPROVED,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.REJECTED,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.INACTIVE,
      isDeleted: false,
    }),
  ]);

  return sendResponse(
    res,
    200,
    true,
    "Dashboard statistics fetched successfully.",
    {
      totalApartments,
      pending,
      approved,
      rejected,
      inactive,
    }
  );
});

// ======================================
// Get All Host Apartments
// ======================================

const getMyApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
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
// Get Pending Apartments
// ======================================

const getPendingApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
    status: APARTMENT_STATUS.PENDING,
    isDeleted: false,
  }).sort({
    createdAt: -1,
  });

  return sendResponse(
    res,
    200,
    true,
    "Pending apartments fetched successfully.",
    apartments
  );
});

// ======================================
// Get Approved Apartments
// ======================================

const getApprovedApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  }).sort({
    createdAt: -1,
  });

  return sendResponse(
    res,
    200,
    true,
    "Approved apartments fetched successfully.",
    apartments
  );
});

// ======================================
// Get Rejected Apartments
// ======================================

const getRejectedApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
    status: APARTMENT_STATUS.REJECTED,
    isDeleted: false,
  }).sort({
    createdAt: -1,
  });

  return sendResponse(
    res,
    200,
    true,
    "Rejected apartments fetched successfully.",
    apartments
  );
});

// ======================================
// Get Inactive Apartments
// ======================================

const getInactiveApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
    status: APARTMENT_STATUS.INACTIVE,
    isDeleted: false,
  }).sort({
    createdAt: -1,
  });

  return sendResponse(
    res,
    200,
    true,
    "Inactive apartments fetched successfully.",
    apartments
  );
});

// ======================================
// Export Controllers
// ======================================

module.exports = {
  getDashboardStats,
  getMyApartments,
  getPendingApartments,
  getApprovedApartments,
  getRejectedApartments,
  getInactiveApartments,
};