const { callOpenRouter } = require("./openRouter.service");

const countryCodeMap = {
  india: "IN",
  bharat: "IN",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  australia: "AU",
  canada: "CA",
};

const getCountryCode = (country) => {
  const normalized = String(country || "").trim().toLowerCase();
  if (/^[a-z]{2}$/i.test(normalized)) return normalized.toUpperCase();
  return countryCodeMap[normalized] || process.env.HOLIDAY_COUNTRY_CODE || "IN";
};

const fetchHolidayYear = async ({ baseUrl, year, countryCode }) => {
  try {
    const response = await fetch(`${baseUrl}/PublicHolidays/${year}/${countryCode}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const holidays = await response.json();
    return Array.isArray(holidays) ? holidays : [];
  } catch {
    return [];
  }
};

const fetchUpcomingHoliday = async ({ country, days = 21 }) => {
  const countryCode = getCountryCode(country);
  const now = new Date();
  const end = new Date(now.getTime() + Number(days) * 86400000);
  const baseUrl = process.env.NAGER_DATE_BASE_URL || "https://date.nager.at/api/v3";
  const years = [...new Set([now.getFullYear(), end.getFullYear()])];
  const results = await Promise.all(
    years.map((year) => fetchHolidayYear({ baseUrl, year, countryCode }))
  );

  return results
    .flat()
    .map((holiday) => ({
      ...holiday,
      parsedDate: new Date(`${holiday.date}T00:00:00`),
    }))
    .filter(
      (holiday) =>
        !Number.isNaN(holiday.parsedDate.getTime()) &&
        holiday.parsedDate >= new Date(now.toDateString()) &&
        holiday.parsedDate <= end
    )
    .sort((a, b) => a.parsedDate - b.parsedDate)[0] || null;
};

const fetchWeatherForecast = async ({ latitude, longitude, city }) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({ appid: apiKey, units: "metric", cnt: "16" });
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      params.set("lat", String(latitude));
      params.set("lon", String(longitude));
    } else if (city) {
      params.set("q", String(city));
    } else {
      return null;
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`
    );
    if (!response.ok) return null;

    const payload = await response.json();
    const rows = Array.isArray(payload.list) ? payload.list : [];
    if (!rows.length) return null;

    const temperatures = rows
      .map((row) => Number(row.main?.temp))
      .filter(Number.isFinite);
    const conditions = rows
      .map((row) => row.weather?.[0]?.description)
      .filter(Boolean);
    const rainProbability = rows.map((row) => Number(row.pop || 0));

    return {
      city: payload.city?.name || city || "",
      averageTemperature: temperatures.length
        ? Number(
            (
              temperatures.reduce((total, temperature) => total + temperature, 0) /
              temperatures.length
            ).toFixed(1)
          )
        : null,
      dominantCondition:
        conditions.sort(
          (first, second) =>
            conditions.filter((value) => value === second).length -
            conditions.filter((value) => value === first).length
        )[0] || "forecast available",
      maximumRainProbability: rainProbability.length
        ? Math.round(Math.max(...rainProbability) * 100)
        : 0,
    };
  } catch {
    return null;
  }
};

const parseSuggestion = (content, basePrice) => {
  const cleaned = String(content || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    data = JSON.parse(cleaned.slice(start, end + 1));
  }
  const minimum = Math.max(Math.round(basePrice * 0.6), 1);
  const maximum = Math.max(Math.round(basePrice * 1.8), minimum);
  const suggestedPrice = Math.min(Math.max(Math.round(Number(data.suggestedPrice || basePrice)), minimum), maximum);
  return {
    suggestedPrice,
    reason: String(data.reason || "Demand indicators support a small pricing adjustment.").trim().slice(0, 500),
  };
};

const generateAiPriceSuggestion = async ({ basePrice, location }) => {
  const currentPrice = Number(basePrice);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    const error = new Error("A valid base price is required for AI price suggestions.");
    error.statusCode = 400;
    throw error;
  }

  const [holiday, weather] = await Promise.all([
    fetchUpcomingHoliday({ country: location?.country }),
    fetchWeatherForecast({ latitude: location?.latitude, longitude: location?.longitude, city: location?.city }),
  ]);

  const context = {
    currentPrice,
    location: [location?.area, location?.city, location?.state, location?.country].filter(Boolean).join(", "),
    upcomingHoliday: holiday ? { name: holiday.localName || holiday.name, date: holiday.date } : null,
    weather,
  };

  const content = await callOpenRouter({
    system: "You are a conservative hospitality pricing assistant. Suggest, never force. Return valid JSON only and no markdown.",
    user: `Recommend one reasonable reference price in INR using only the supplied facts. Do not invent events or demand data. Keep the suggestion between 60% and 180% of the current price.\nContext: ${JSON.stringify(context)}\nReturn exactly: {"suggestedPrice":2600,"reason":"One short factual reason under 180 characters."}`,
    temperature: 0.25,
    maxTokens: 220,
  });

  return { ...parseSuggestion(content, currentPrice), context };
};

module.exports = { generateAiPriceSuggestion, fetchUpcomingHoliday, fetchWeatherForecast };
