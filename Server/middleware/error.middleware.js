const multer = require("multer");
const sendResponse = require("../utils/sendResponse");

const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const requestId = req.requestId || "unknown";

  console.error(
    `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl}`,
    isProduction
      ? {
          name: err.name,
          message: err.message,
          statusCode: err.statusCode,
          code: err.code,
        }
      : err
  );

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendResponse(res, 413, false, "Uploaded file is too large.", {
        requestId,
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return sendResponse(res, 413, false, "Too many uploaded files.", {
        requestId,
      });
    }

    return sendResponse(res, 400, false, "Invalid multipart upload request.", {
      requestId,
    });
  }

  if (err?.type === "entity.too.large") {
    return sendResponse(res, 413, false, "Request body is too large.", {
      requestId,
    });
  }

  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return sendResponse(res, 400, false, "Invalid JSON request body.", {
      requestId,
    });
  }

  if (err.name === "ValidationError") {
    return sendResponse(
      res,
      400,
      false,
      Object.values(err.errors || {})[0]?.message || "Validation failed.",
      { requestId }
    );
  }

  if (err.name === "CastError") {
    return sendResponse(res, 400, false, "Invalid resource identifier.", {
      requestId,
    });
  }

  if (err.code === 11000) {
    return sendResponse(res, 409, false, "Resource already exists.", {
      requestId,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return sendResponse(res, 401, false, "Invalid token.", { requestId });
  }

  if (err.name === "TokenExpiredError") {
    return sendResponse(res, 401, false, "Token has expired.", { requestId });
  }

  const statusCode = Number(err.statusCode || err.status || 500);
  const safeMessage =
    statusCode >= 500 && isProduction
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  return sendResponse(res, statusCode, false, safeMessage, {
    requestId,
    ...(statusCode < 500 && err.code ? { code: err.code } : {}),
  });
};

module.exports = errorHandler;