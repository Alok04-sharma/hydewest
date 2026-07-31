const REQUIRED_ENV = [
  "MONGO_URI",
  "JWT_SECRET",
  "OTP_HASH_SECRET",
  "CLIENT_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
];

const validateOrigin = (value, key) => {
  let parsed;

  try {
    parsed = new URL(String(value || "").trim());
  } catch {
    throw new Error(`${key} must be a valid absolute URL.`);
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error(`${key} must use HTTPS in production.`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(
      `${key} must contain only the origin, without a path or query.`
    );
  }
};

const validateBoolean = (key) => {
  if (process.env[key] === undefined || process.env[key] === "") return;

  if (!["true", "false"].includes(String(process.env[key]).toLowerCase())) {
    throw new Error(`${key} must be either true or false.`);
  }
};

const validateEnv = () => {
  const missing = REQUIRED_ENV.filter(
    (key) => !String(process.env[key] || "").trim()
  );

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (String(process.env.JWT_SECRET).length < 64) {
    throw new Error("JWT_SECRET must contain at least 64 characters.");
  }

  if (String(process.env.OTP_HASH_SECRET).length < 64) {
    throw new Error("OTP_HASH_SECRET must contain at least 64 characters.");
  }

  if (process.env.JWT_SECRET === process.env.OTP_HASH_SECRET) {
    throw new Error("JWT_SECRET and OTP_HASH_SECRET must be different values.");
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(String(process.env.MONGO_URI))) {
    throw new Error("MONGO_URI must be a valid MongoDB connection string.");
  }

  validateOrigin(process.env.CLIENT_URL, "CLIENT_URL");

  const additionalOrigins = String(process.env.CLIENT_URLS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  additionalOrigins.forEach((origin, index) =>
    validateOrigin(origin, `CLIENT_URLS entry ${index + 1}`)
  );

  validateBoolean("RUN_BACKGROUND_JOBS");
  validateBoolean("LOG_DEV_OTP");
  validateBoolean("MONGO_AUTO_INDEX");

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 1);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
    throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 5.");
  }
};

module.exports = {
  validateEnv,
};