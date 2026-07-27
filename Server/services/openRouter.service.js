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

module.exports = {
  callOpenRouter,
  generateListingNames,
  improveListingDescription,
};