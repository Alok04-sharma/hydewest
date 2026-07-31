const normalizeOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/$/, "");

const getAllowedOrigins = () => {
  const configured = [
    process.env.CLIENT_URL,
    ...(String(process.env.CLIENT_URLS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    configured.push(
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173"
    );
  }

  return [...new Set(configured)];
};

const allowedOrigins = getAllowedOrigins();

const isOriginAllowed = (origin) => {
  // Postman, curl, mobile apps and server-to-server requests often have no Origin.
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(normalizeOrigin(origin));
};

const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }

  const error = new Error("Origin is not allowed by CORS policy.");
  error.statusCode = 403;
  return callback(error);
};

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After"],
  maxAge: 86400,
};

module.exports = {
  allowedOrigins,
  corsOrigin,
  corsOptions,
  isOriginAllowed,
};