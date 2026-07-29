const asyncHandler = require("express-async-handler");
const SearchAnalytics = require("../models/searchAnalytics.model");
const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");

const NORMALIZE = { $toLower: { $trim: { input: { $ifNull: ["$$VALUE", ""] } } } };

const groupSearches = async ({ field, label, limit = 12 }) => {
  const match = { [field]: { $nin: ["", null] } };
  const fieldRef = `$${field}`;

  return SearchAnalytics.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $toLower: { $trim: { input: fieldRef } } },
        label: { $first: fieldRef },
        searchCount: { $sum: "$searchCount" },
        uniqueSearchers: { $addToSet: { $ifNull: ["$guest", "$searchKey"] } },
        lastSearchedAt: { $max: "$lastSearchedAt" },
      },
    },
    {
      $lookup: {
        from: "apartments",
        let: { locationValue: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$status", APARTMENT_STATUS.APPROVED] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                  {
                    $eq: [
                      { $toLower: { $trim: { input: { $ifNull: [`$location.${field === "pinCode" ? "zipCode" : field}`, ""] } } } },
                      "$$locationValue",
                    ],
                  },
                ],
              },
            },
          },
          { $count: "count" },
        ],
        as: "listingStats",
      },
    },
    {
      $lookup: {
        from: "bookings",
        let: { locationValue: "$_id" },
        pipeline: [
          { $match: { isDeleted: { $ne: true }, paymentStatus: { $in: ["paid", "success"] } } },
          {
            $lookup: {
              from: "apartments",
              localField: "apartment",
              foreignField: "_id",
              as: "apartmentDoc",
            },
          },
          { $unwind: "$apartmentDoc" },
          {
            $match: {
              $expr: {
                $eq: [
                  { $toLower: { $trim: { input: { $ifNull: [`$apartmentDoc.location.${field === "pinCode" ? "zipCode" : field}`, ""] } } } },
                  "$$locationValue",
                ],
              },
            },
          },
          { $count: "count" },
        ],
        as: "bookingStats",
      },
    },
    {
      $project: {
        _id: 0,
        key: "$_id",
        [label]: "$label",
        searchCount: 1,
        uniqueSearchers: { $size: "$uniqueSearchers" },
        lastSearchedAt: 1,
        availableListings: { $ifNull: [{ $first: "$listingStats.count" }, 0] },
        totalBookings: { $ifNull: [{ $first: "$bookingStats.count" }, 0] },
      },
    },
    { $sort: { searchCount: -1, availableListings: 1 } },
    { $limit: limit },
  ]);
};

const getSearchAnalytics = asyncHandler(async (_req, res) => {
  const [cities, areas, pinCodes, summary] = await Promise.all([
    groupSearches({ field: "city", label: "city" }),
    groupSearches({ field: "area", label: "area" }),
    groupSearches({ field: "pinCode", label: "pinCode" }),
    SearchAnalytics.aggregate([
      {
        $group: {
          _id: null,
          totalSearches: { $sum: "$searchCount" },
          trackedSearchRows: { $sum: 1 },
          loggedInGuests: { $addToSet: "$guest" },
          latestSearchAt: { $max: "$lastSearchedAt" },
        },
      },
      {
        $project: {
          _id: 0,
          totalSearches: 1,
          trackedSearchRows: 1,
          latestSearchAt: 1,
          loggedInGuests: {
            $size: {
              $filter: {
                input: "$loggedInGuests",
                as: "guest",
                cond: { $ne: ["$$guest", null] },
              },
            },
          },
        },
      },
    ]),
  ]);

  const demandRows = [...cities.map((row) => ({ ...row, locationType: "city", location: row.city })), ...areas.map((row) => ({ ...row, locationType: "area", location: row.area }))];
  const recommendationThreshold = Number(process.env.SEARCH_HIGH_DEMAND_THRESHOLD || 10);
  const recommendations = demandRows
    .filter((row) => row.searchCount >= recommendationThreshold && row.availableListings <= Math.max(2, Math.floor(row.searchCount * 0.12)))
    .sort((a, b) => b.searchCount - a.searchCount)
    .slice(0, 12)
    .map((row) => ({
      ...row,
      recommendation: "High Search Demand - Need More Hosts",
      demandGap: Math.max(row.searchCount - row.availableListings, 0),
    }));

  return sendResponse(res, 200, true, "Search analytics fetched successfully.", {
    summary: summary[0] || { totalSearches: 0, trackedSearchRows: 0, loggedInGuests: 0, latestSearchAt: null },
    mostSearchedCities: cities,
    mostSearchedAreas: areas,
    mostSearchedPinCodes: pinCodes,
    recommendations,
  });
});

module.exports = { getSearchAnalytics };
