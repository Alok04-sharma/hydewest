const crypto = require("crypto");
const sendResponse = require("../utils/sendResponse");

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const requestContext = (req, res, next) => {
  const supplied = String(req.get("x-request-id") || "").trim();
  const requestId = SAFE_REQUEST_ID.test(supplied)
    ? supplied
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  return next();
};

const findUnsafeKey = (value, path = "body") => {
  if (!value || typeof value !== "object") return null;
  if (Buffer.isBuffer(value) || value instanceof Date) return null;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const issue = findUnsafeKey(value[index], `${path}[${index}]`);
      if (issue) return issue;
    }
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      key.startsWith("$") ||
      key.includes(".") ||
      BLOCKED_KEYS.has(key)
    ) {
      return `${path}.${key}`;
    }

    const issue = findUnsafeKey(nestedValue, `${path}.${key}`);
    if (issue) return issue;
  }

  return null;
};

const rejectMongoOperators = (req, res, next) => {
  const unsafePath =
    findUnsafeKey(req.body, "body") ||
    findUnsafeKey(req.query, "query") ||
    findUnsafeKey(req.params, "params");

  if (unsafePath) {
    return sendResponse(
      res,
      400,
      false,
      "Request contains an unsupported field name.",
      { requestId: req.requestId }
    );
  }

  return next();
};

module.exports = {
  requestContext,
  rejectMongoOperators,
};