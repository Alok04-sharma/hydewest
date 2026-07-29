const crypto = require("crypto");
const SearchAnalytics = require("../models/searchAnalytics.model");

const clean = (value, max = 240) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);

const dayBucket = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const buildSearchLocation = (query = {}) => {
  const rawLocation = clean(query.location);
  const explicitCity = clean(query.city, 100);
  const explicitState = clean(query.state, 100);
  const explicitArea = clean(query.area, 120);
  const explicitPin = clean(query.pinCode || query.zipCode || query.pin, 12);

  const pinFromText = rawLocation.match(/\b\d{6}\b/)?.[0] || "";
  const parts = rawLocation.split(",").map((item) => item.trim()).filter(Boolean);

  return {
    searchText: rawLocation || explicitCity || explicitArea || explicitPin,
    city: explicitCity || (parts.length === 1 && !pinFromText ? parts[0] : ""),
    state: explicitState || (parts.length >= 2 ? parts[parts.length - 1] : ""),
    area: explicitArea || (parts.length >= 2 ? parts[0] : ""),
    pinCode: explicitPin || pinFromText,
    propertyType: clean(query.propertyType, 80),
  };
};

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

  // Do not pollute analytics when the page only fetches the default listing feed.
  if (!hasIntent) return null;

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
  const searchKey = crypto.createHash("sha256").update(signature).digest("hex");
  const now = new Date();

  return SearchAnalytics.findOneAndUpdate(
    { searchKey },
    {
      $setOnInsert: {
        guest: guestId || null,
        ...location,
        dayBucket: bucket,
        firstSearchedAt: now,
        searchKey,
      },
      $set: { lastSearchedAt: now },
      $inc: { searchCount: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = { recordSearch, buildSearchLocation };
