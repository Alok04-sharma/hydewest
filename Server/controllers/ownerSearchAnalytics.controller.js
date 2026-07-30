const asyncHandler = require("express-async-handler");

const SearchAnalytics = require("../models/searchAnalytics.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

// Version-1 documents started at two because schema default one and $inc one
// were both applied during upsert. Version-2 documents contain the exact count.
const effectiveSearchCount = {
  $cond: [
    {
      $eq: [{ $ifNull: ["$countVersion", 1] }, 2],
    },
    "$searchCount",
    {
      $max: [{ $subtract: ["$searchCount", 1] }, 1],
    },
  ],
};

const normalize = (input) => ({
  $toLower: {
    $trim: {
      input: {
        $ifNull: [input, ""],
      },
    },
  },
});


const getIstCalendarParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
};

const moveCalendarDay = (parts, amount) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + amount);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const calendarDayKey = (parts) =>
  `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;

const completeDailyTrend = (rows, range) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (range === "all") {
    return safeRows.slice(-365);
  }

  const days = RANGE_DAYS[range] || 30;
  const rowMap = new Map(safeRows.map((row) => [row.date, row]));
  const today = getIstCalendarParts();

  return Array.from({ length: days }, (_, index) => {
    const parts = moveCalendarDay(today, index - days + 1);
    const key = calendarDayKey(parts);

    return (
      rowMap.get(key) || {
        date: key,
        searches: 0,
        uniqueGroups: 0,
      }
    );
  });
};

const getRangeStart = (range) => {
  const days = RANGE_DAYS[range];

  if (!days) {
    return null;
  }

  return new Date(Date.now() - (days - 1) * DAY_MS);
};

const getRangeMatch = (rangeStart) => {
  if (!rangeStart) {
    return {};
  }

  return {
    lastSearchedAt: {
      $gte: rangeStart,
    },
  };
};

const getApartmentValueExpression = (field) => {
  if (field === "propertyType") {
    return normalize("$propertyType");
  }

  if (field === "pinCode") {
    return normalize("$location.zipCode");
  }

  return normalize(`$location.${field}`);
};

const getBookedApartmentValueExpression = (field) => {
  if (field === "propertyType") {
    return normalize("$apartmentDoc.propertyType");
  }

  if (field === "pinCode") {
    return normalize("$apartmentDoc.location.zipCode");
  }

  return normalize(`$apartmentDoc.location.${field}`);
};

// ======================================
// Demand aggregation for location/type groups
// ======================================

const groupDemand = async ({
  field,
  label,
  contextField = null,
  rangeMatch = {},
  bookingStartDate = null,
  limit = 12,
}) => {
  const fieldRef = `$${field}`;
  const contextRef = contextField ? `$${contextField}` : null;

  const listingConditions = [
    {
      $eq: ["$status", APARTMENT_STATUS.APPROVED],
    },
    {
      $eq: [{ $ifNull: ["$isDeleted", false] }, false],
    },
    {
      $eq: [getApartmentValueExpression(field), "$$value"],
    },
  ];

  const bookingConditions = [
    {
      $eq: [getBookedApartmentValueExpression(field), "$$value"],
    },
  ];

  if (contextField === "city") {
    const listingCity = normalize("$location.city");
    const bookingCity = normalize("$apartmentDoc.location.city");

    listingConditions.push({
      $or: [
        { $eq: ["$$context", ""] },
        { $eq: [listingCity, "$$context"] },
      ],
    });

    bookingConditions.push({
      $or: [
        { $eq: ["$$context", ""] },
        { $eq: [bookingCity, "$$context"] },
      ],
    });
  }

  const project = {
    _id: 0,
    key: {
      $cond: [
        { $eq: ["$_id.context", ""] },
        "$_id.value",
        {
          $concat: ["$_id.context", "|", "$_id.value"],
        },
      ],
    },
    [label]: "$displayValue",
    searchCount: 1,
    uniqueSearchers: {
      $size: "$uniqueSearchers",
    },
    lastSearchedAt: 1,
    availableListings: {
      $ifNull: [{ $first: "$listingStats.count" }, 0],
    },
    totalBookings: {
      $ifNull: [{ $first: "$bookingStats.count" }, 0],
    },
  };

  if (contextField) {
    project[contextField] = "$displayContext";
  }

  return SearchAnalytics.aggregate([
    {
      $match: {
        ...rangeMatch,
        [field]: {
          $nin: ["", null],
        },
      },
    },
    {
      $addFields: {
        effectiveSearchCount,
      },
    },
    {
      $group: {
        _id: {
          value: normalize(fieldRef),
          context: contextRef ? normalize(contextRef) : "",
        },
        displayValue: {
          $first: fieldRef,
        },
        displayContext: {
          $first: contextRef || "",
        },
        searchCount: {
          $sum: "$effectiveSearchCount",
        },
        uniqueSearchers: {
          $addToSet: {
            $cond: [
              { $ne: ["$guest", null] },
              {
                $concat: ["guest:", { $toString: "$guest" }],
              },
              {
                $concat: ["anonymous:", "$searchKey"],
              },
            ],
          },
        },
        lastSearchedAt: {
          $max: "$lastSearchedAt",
        },
      },
    },
    {
      $lookup: {
        from: "apartments",
        let: {
          value: "$_id.value",
          context: "$_id.context",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: listingConditions,
              },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "listingStats",
      },
    },
    {
      $lookup: {
        from: "bookings",
        let: {
          value: "$_id.value",
          context: "$_id.context",
        },
        pipeline: [
          {
            $match: {
              isDeleted: {
                $ne: true,
              },
              paymentStatus: {
                $in: ["paid", "success"],
              },
              ...(bookingStartDate
                ? {
                    createdAt: {
                      $gte: bookingStartDate,
                    },
                  }
                : {}),
            },
          },
          {
            $lookup: {
              from: "apartments",
              localField: "apartment",
              foreignField: "_id",
              as: "apartmentDoc",
            },
          },
          {
            $unwind: "$apartmentDoc",
          },
          {
            $match: {
              $expr: {
                $and: bookingConditions,
              },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "bookingStats",
      },
    },
    {
      $project: project,
    },
    {
      $addFields: {
        demandGap: {
          $max: [{ $subtract: ["$searchCount", "$availableListings"] }, 0],
        },
        searchesPerListing: {
          $divide: [
            "$searchCount",
            {
              $max: ["$availableListings", 1],
            },
          ],
        },
      },
    },
    {
      $sort: {
        searchCount: -1,
        availableListings: 1,
        lastSearchedAt: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);
};

// ======================================
// Search-demand analytics
// GET /api/owner/analytics/search?range=30d
// ======================================

const getSearchAnalytics = asyncHandler(async (req, res) => {
  const range = Object.prototype.hasOwnProperty.call(RANGE_DAYS, req.query.range)
    ? req.query.range
    : "30d";

  const rangeStart = getRangeStart(range);
  const rangeMatch = getRangeMatch(rangeStart);

  const [
    cities,
    states,
    areas,
    pinCodes,
    propertyTypes,
    summaryRows,
    rawDailyTrend,
  ] = await Promise.all([
    groupDemand({
      field: "city",
      label: "city",
      rangeMatch,
      bookingStartDate: rangeStart,
    }),
    groupDemand({
      field: "state",
      label: "state",
      rangeMatch,
      bookingStartDate: rangeStart,
    }),
    groupDemand({
      field: "area",
      label: "area",
      contextField: "city",
      rangeMatch,
      bookingStartDate: rangeStart,
    }),
    groupDemand({
      field: "pinCode",
      label: "pinCode",
      contextField: "city",
      rangeMatch,
      bookingStartDate: rangeStart,
    }),
    groupDemand({
      field: "propertyType",
      label: "propertyType",
      rangeMatch,
      bookingStartDate: rangeStart,
    }),
    SearchAnalytics.aggregate([
      {
        $match: rangeMatch,
      },
      {
        $addFields: {
          effectiveSearchCount,
        },
      },
      {
        $group: {
          _id: null,
          totalSearches: {
            $sum: "$effectiveSearchCount",
          },
          trackedSearchRows: {
            $sum: 1,
          },
          loggedInGuests: {
            $addToSet: "$guest",
          },
          anonymousSearchRows: {
            $sum: {
              $cond: [{ $eq: ["$guest", null] }, 1, 0],
            },
          },
          latestSearchAt: {
            $max: "$lastSearchedAt",
          },
          earliestSearchAt: {
            $min: "$firstSearchedAt",
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSearches: 1,
          trackedSearchRows: 1,
          anonymousSearchRows: 1,
          latestSearchAt: 1,
          earliestSearchAt: 1,
          loggedInGuests: {
            $size: {
              $filter: {
                input: "$loggedInGuests",
                as: "guest",
                cond: {
                  $ne: ["$$guest", null],
                },
              },
            },
          },
        },
      },
    ]),
    SearchAnalytics.aggregate([
      {
        $match: rangeMatch,
      },
      {
        $addFields: {
          effectiveSearchCount,
        },
      },
      {
        $group: {
          _id: "$dayBucket",
          searches: {
            $sum: "$effectiveSearchCount",
          },
          uniqueGroups: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          searches: 1,
          uniqueGroups: 1,
        },
      },
      {
        $limit: range === "all" ? 365 : RANGE_DAYS[range],
      },
    ]),
  ]);

  const recommendationThreshold = Math.max(
    Number(process.env.SEARCH_HIGH_DEMAND_THRESHOLD || 10),
    1
  );

  const demandRows = [
    ...cities.map((row) => ({
      ...row,
      locationType: "city",
      location: row.city,
    })),
    ...areas.map((row) => ({
      ...row,
      locationType: "area",
      location: [row.area, row.city].filter(Boolean).join(", "),
    })),
    ...pinCodes.map((row) => ({
      ...row,
      locationType: "pin code",
      location: [row.pinCode, row.city].filter(Boolean).join(", "),
    })),
  ];

  const recommendations = demandRows
    .filter(
      (row) =>
        row.searchCount >= recommendationThreshold &&
        row.availableListings <=
          Math.max(2, Math.floor(row.searchCount * 0.12))
    )
    .sort(
      (a, b) =>
        b.searchesPerListing - a.searchesPerListing ||
        b.searchCount - a.searchCount
    )
    .slice(0, 12)
    .map((row) => ({
      ...row,
      recommendation: "High Search Demand - Need More Hosts",
    }));

  return sendResponse(
    res,
    200,
    true,
    "Search analytics fetched successfully.",
    {
      range,
      rangeDays: RANGE_DAYS[range],
      summary: summaryRows[0] || {
        totalSearches: 0,
        trackedSearchRows: 0,
        loggedInGuests: 0,
        anonymousSearchRows: 0,
        latestSearchAt: null,
        earliestSearchAt: null,
      },
      dailyTrend: completeDailyTrend(rawDailyTrend, range),
      mostSearchedCities: cities,
      mostSearchedStates: states,
      mostSearchedAreas: areas,
      mostSearchedPinCodes: pinCodes,
      mostSearchedPropertyTypes: propertyTypes,
      recommendations,
      generatedAt: new Date().toISOString(),
    }
  );
});

module.exports = {
  getSearchAnalytics,
};
