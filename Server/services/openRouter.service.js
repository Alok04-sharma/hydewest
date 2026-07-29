const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const getApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    const error = new Error("OPENROUTER_API_KEY is not configured on the server.");
    error.statusCode = 503;
    throw error;
  }
  return key;
};

const callOpenRouter = async ({ system, user, temperature = 0.7, maxTokens = 700 }) => {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(process.env.APP_PUBLIC_URL
        ? { "HTTP-Referer": process.env.APP_PUBLIC_URL }
        : {}),
      "X-Title": process.env.APP_NAME || "hydewest",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || "OpenRouter request failed. Please try again."
    );
    error.statusCode = response.status;
    throw error;
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error("OpenRouter returned an empty response.");
    error.statusCode = 502;
    throw error;
  }

  return String(content).trim();
};

const extractJson = (content) => {
  const cleaned = String(content)
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI response could not be parsed.");
  }
};

const generateListingNames = async ({ location, propertyType, propertyStyle }) => {
  const content = await callOpenRouter({
    system:
      "You are a premium hospitality copywriter. Return valid JSON only. Never include markdown.",
    user: `Generate 6 premium, memorable and truthful property listing names.\nLocation: ${location}\nProperty type: ${propertyType}\nStyle: ${propertyStyle}\nReturn exactly: {"suggestions":["name 1","name 2"]}. Each name must be 10-70 characters and must not make unverifiable claims.`,
    temperature: 0.85,
    maxTokens: 350,
  });

  const data = extractJson(content);
  return Array.isArray(data.suggestions)
    ? data.suggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
    : [];
};

const improveListingDescription = async ({ description, location, propertyType, amenities }) => {
  const content = await callOpenRouter({
    system:
      "You improve property descriptions without inventing facts. Return valid JSON only and no markdown.",
    user: `Improve the following listing description into a clear, premium, guest-friendly description between 120 and 450 words. Keep every factual detail accurate.\nProperty type: ${propertyType}\nLocation: ${location}\nAmenities: ${(amenities || []).join(", ")}\nOriginal description: ${description}\nReturn exactly: {"description":"..."}`,
    temperature: 0.55,
    maxTokens: 850,
  });

  const data = extractJson(content);
  return String(data.description || "").trim();
};


const rankGuestRecommendations = async ({ guestContext, candidates }) => {
  const compactCandidates = (candidates || []).map((item) => ({
    id: String(item._id),
    title: item.title,
    city: item.location?.city || "",
    area: item.location?.area || "",
    propertyType: item.propertyType || "Property",
    amenities: (item.amenities || []).slice(0, 8),
    rating: Number(item.rating || 0),
    pricePerNight: Number(
      item.pricing?.rates?.night ||
        item.pricing?.basePrice ||
        item.pricing?.pricePerNight ||
        0
    ),
  }));

  const content = await callOpenRouter({
    system:
      "You are a travel recommendation assistant for hydewest. Rank only the supplied property IDs. Return valid JSON only, never markdown, and never invent a property.",
    user: `Create personalized stay recommendations from the guest context and candidate properties.
Guest context: ${JSON.stringify(
      guestContext || {}
    )}
Candidate properties: ${JSON.stringify(
      compactCandidates
    )}
Return exactly this JSON shape: {"reason":"one concise personalized explanation","insights":["insight 1","insight 2","insight 3"],"ranked":[{"id":"candidate id","reason":"short truthful reason"}]}. Rank up to 10 supplied IDs.`,
    temperature: 0.45,
    maxTokens: 950,
  });

  const data = extractJson(content);
  const allowedIds = new Set(compactCandidates.map((item) => item.id));
  const ranked = Array.isArray(data.ranked)
    ? data.ranked
        .map((item) => ({
          id: String(item?.id || ""),
          reason: String(item?.reason || "Selected for your travel preferences.").trim(),
        }))
        .filter((item) => allowedIds.has(item.id))
        .slice(0, 10)
    : [];

  return {
    reason: String(data.reason || "AI-selected stays based on your hydewest activity.").trim(),
    insights: Array.isArray(data.insights)
      ? data.insights.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
      : [],
    ranked,
  };
};

const generateGuestTripPlan = async ({ city, budget, days, guests, candidateStays }) => {
  const safeDays = Math.min(Math.max(Number(days || 1), 1), 30);
  const stays = (candidateStays || []).map((item) => ({
    id: String(item._id),
    title: item.title,
    area: item.location?.area || "",
    city: item.location?.city || city,
    pricePerNight: Number(
      item.pricing?.rates?.night ||
        item.pricing?.basePrice ||
        item.pricing?.pricePerNight ||
        0
    ),
    rating: Number(item.rating || 0),
  }));

  const content = await callOpenRouter({
    system:
      "You are a careful India travel planner. Return valid JSON only and no markdown. Do not claim live opening hours, guaranteed availability, or unverified events. Keep plans practical for the stated budget and group size.",
    user: `Create a ${safeDays}-day trip plan.
Destination: ${city}
Total budget: INR ${Number(
      budget || 0
    )}
Guests: ${Number(guests || 1)}
Candidate hydewest stays: ${JSON.stringify(
      stays
    )}
Return exactly: {"summary":"2-3 sentence overview","travelStyle":"short label","budgetAdvice":"short practical budget note","itinerary":[{"day":1,"morning":"...","afternoon":"...","evening":"...","estimatedSpend":0}],"tips":["tip 1","tip 2","tip 3"]}. Return exactly ${safeDays} itinerary entries. Use INR numeric estimatedSpend values and keep the combined daily estimates realistic within the total budget.`,
    temperature: 0.62,
    maxTokens: Math.min(2600, 650 + safeDays * 125),
  });

  const data = extractJson(content);
  const rawItinerary = Array.isArray(data.itinerary) ? data.itinerary : [];
  const itinerary = Array.from({ length: safeDays }, (_, index) => {
    const item = rawItinerary[index] || {};
    return {
      day: index + 1,
      morning: String(item.morning || "Start with breakfast and a relaxed local walk.").trim(),
      afternoon: String(item.afternoon || "Explore a well-known local area at a comfortable pace.").trim(),
      evening: String(item.evening || "Try local food and keep the evening flexible.").trim(),
      estimatedSpend: Math.max(Number(item.estimatedSpend || 0), 0),
    };
  });

  return {
    summary: String(data.summary || `A balanced ${safeDays}-day plan for ${city}.`).trim(),
    travelStyle: String(data.travelStyle || "Balanced explorer").trim(),
    budgetAdvice: String(data.budgetAdvice || "Keep a small contingency amount for local transport and changes.").trim(),
    itinerary,
    tips: Array.isArray(data.tips)
      ? data.tips.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : [],
  };
};

module.exports = {
  callOpenRouter,
  generateListingNames,
  improveListingDescription,
  rankGuestRecommendations,
  generateGuestTripPlan,
};