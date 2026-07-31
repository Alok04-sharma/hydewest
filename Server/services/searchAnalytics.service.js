const crypto = require("crypto");

const SearchAnalytics = require("../models/searchAnalytics.model");

const clean = (value, max = 240) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);

const dayBucket = (date = new Date()) =>
  date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

// ======================================
// Search location normalisation
// ======================================

const buildSearchLocation = (query = {}) => {
  const rawLocation = clean(query.location);
  const explicitCity = clean(query.city, 100);
  const explicitState = clean(query.state, 100);
  const explicitArea = clean(query.area, 120);
  const explicitPin = clean(
    query.pinCode || query.zipCode || query.pin,
    12
  );

  const pinFromText = rawLocation.match(/\b\d{6}\b/)?.[0] || "";

  const parts = rawLocation
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let inferredCity = "";
  let inferredState = "";
  let inferredArea = "";

  if (parts.length === 1 && !pinFromText) {
    inferredCity = parts[0];
  } else if (parts.length === 2) {
    inferredCity = parts[0];
    inferredState = parts[1];
  } else if (parts.length >= 3) {
    inferredArea = parts[0];
    inferredCity = parts[parts.length - 2];
    inferredState = parts[parts.length - 1];
  }

  return {
    searchText:
      rawLocation || explicitCity || explicitArea || explicitPin,
    city: explicitCity || inferredCity,
    state: explicitState || inferredState,
    area: explicitArea || inferredArea,
    pinCode: explicitPin || pinFromText,
    propertyType: clean(query.propertyType, 80),
  };
};

// ======================================
// Record one search without double-counting first insert
// ======================================

const recordSearch = async ({ query = {}, guestId = null }) => {
  const location = buildSearchLocation(query);

  const hasIntent = Boolean(
    location.searchText ||
      location.city ||
      location.state ||
      location.area ||
      location.pinCode ||
      location.propertyType
  );

  // Default listing feed should not create analytics noise.
  if (!hasIntent) {
    return null;
  }

  const bucket = dayBucket();
  const guestKey = guestId ? String(guestId) : "anonymous";

  const signature = [
    guestKey,
    bucket,
    location.searchText.toLowerCase(),
    location.city.toLowerCase(),
    location.state.toLowerCase(),
    location.area.toLowerCase(),
    location.pinCode,
    location.propertyType.toLowerCase(),
  ].join("|");

  const searchKey = crypto
    .createHash("sha256")
    .update(signature)
    .digest("hex");

  const now = new Date();

  // Existing row: increment exactly once.
  const existingRow = await SearchAnalytics.findOneAndUpdate(
    { searchKey },
    {
      $set: {
        lastSearchedAt: now,
      },
      $inc: {
        searchCount: 1,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (existingRow) {
    return existingRow;
  }

  // New row: start at one instead of schema default one plus another increment.
  try {
    return await SearchAnalytics.create({
      guest: guestId || null,
      ...location,
      searchCount: 1,
      countVersion: 2,
      dayBucket: bucket,
      firstSearchedAt: now,
      lastSearchedAt: now,
      searchKey,
    });
  } catch (error) {
    // Concurrent identical requests may race on the unique searchKey.
    if (error?.code === 11000) {
      return SearchAnalytics.findOneAndUpdate(
        { searchKey },
        {
          $set: {
            lastSearchedAt: now,
          },
          $inc: {
            searchCount: 1,
          },
        },
        {
          returnDocument: "after",
        }
      );
    }

    throw error;
  }
};

module.exports = {
  recordSearch,
  buildSearchLocation,
};
