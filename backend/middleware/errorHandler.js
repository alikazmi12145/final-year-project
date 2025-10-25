/**
 * Enhanced Error Handling Middleware for Poetry Collection Module
 * Provides comprehensive error handling, validation, and logging
 */

import mongoose from "mongoose";

/**
 * Validation middleware for ObjectId parameters
 */
export const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`,
        errorCode: "MISSING_PARAMETER",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
        errorCode: "INVALID_OBJECT_ID",
        received: id,
      });
    }

    next();
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errorCode: "VALIDATION_ERROR",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }
    next();
  };

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      status: 409,
      response: {
        success: false,
        message: `Duplicate value for ${field}`,
        errorCode: "DUPLICATE_KEY_ERROR",
        field: field,
      },
    };
  }

  if (error.name === "CastError") {
    return {
      status: 400,
      response: {
        success: false,
        message: `Invalid ${error.path} format`,
        errorCode: "CAST_ERROR",
        path: error.path,
        value: error.value,
      },
    };
  }

  return null; // Let other errors be handled by generic handler
};

/**
 * OpenAI error handler
 */
export const handleOpenAIError = (error) => {
  if (error.status === 429 || error.code === "insufficient_quota") {
    return {
      status: 503,
      response: {
        success: false,
        message: "AI service temporarily unavailable due to quota limits",
        errorCode: "AI_QUOTA_EXCEEDED",
        fallbackAvailable: true,
      },
    };
  }

  if (error.status === 401) {
    return {
      status: 503,
      response: {
        success: false,
        message: "AI service authentication failed",
        errorCode: "AI_AUTH_ERROR",
      },
    };
  }

  if (error.code === "context_length_exceeded") {
    return {
      status: 400,
      response: {
        success: false,
        message: "Content too long for AI processing",
        errorCode: "AI_CONTENT_TOO_LONG",
        suggestion: "Try with shorter content",
      },
    };
  }

  return {
    status: 503,
    response: {
      success: false,
      message: "AI service error",
      errorCode: "AI_SERVICE_ERROR",
      details: error.message,
    },
  };
};

/**
 * External API error handler (for Rekhta API)
 */
export const handleExternalAPIError = (error, serviceName = "External API") => {
  if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return {
      status: 503,
      response: {
        success: false,
        message: `${serviceName} is currently unavailable`,
        errorCode: "EXTERNAL_API_UNAVAILABLE",
        fallbackAvailable: true,
      },
    };
  }

  if (error.response?.status === 429) {
    return {
      status: 429,
      response: {
        success: false,
        message: `${serviceName} rate limit exceeded`,
        errorCode: "EXTERNAL_API_RATE_LIMIT",
        retryAfter: error.response.headers["retry-after"] || "60",
      },
    };
  }

  if (error.response?.status >= 400 && error.response?.status < 500) {
    return {
      status: 502,
      response: {
        success: false,
        message: `${serviceName} request failed`,
        errorCode: "EXTERNAL_API_CLIENT_ERROR",
        statusCode: error.response.status,
      },
    };
  }

  return {
    status: 502,
    response: {
      success: false,
      message: `${serviceName} error`,
      errorCode: "EXTERNAL_API_ERROR",
      details: error.message,
    },
  };
};

/**
 * Comprehensive async error handler wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`Error in ${req.method} ${req.path}:`, error);

      // Check if response has already been sent
      if (res.headersSent) {
        console.warn("Response already sent, skipping error handler");
        return next(error);
      }

      // Try specific error handlers first
      // handleMongoError removed (not defined)

      // Check if it's an OpenAI error
      if (
        error.message?.includes("OpenAI") ||
        error.status ||
        error.code === "insufficient_quota"
      ) {
        handled = handleOpenAIError(error);
        if (handled) {
          return res.status(handled.status).json(handled.response);
        }
      }

      // Check if it's an external API error
      if (error.code || error.response) {
        handled = handleExternalAPIError(error);
        if (handled) {
          return res.status(handled.status).json(handled.response);
        }
      }

      // Generic error handling
      const status = error.status || error.statusCode || 500;
      const message = error.message || "Internal server error";

      // Double-check that response hasn't been sent before sending generic error
      if (!res.headersSent) {
        res.status(status).json({
          success: false,
          message:
            status === 500 ? "خرابی ہوئی، براہ کرم دوبارہ کوشش کریں" : message, // Error occurred, please try again
          errorCode: "INTERNAL_ERROR",
          timestamp: new Date().toISOString(),
          requestId:
            req.headers["x-request-id"] ||
            Math.random().toString(36).substr(2, 9),
          ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        });
      }
    });
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId =
    req.headers["x-request-id"] || Math.random().toString(36).substr(2, 9);

  req.requestId = requestId;

  console.log(
    `🔍 ${req.method} ${req.path} - Request ID: ${requestId} - User: ${
      req.user?.userId || "anonymous"
    }`
  );

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== "GET" && req.body) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    console.log(`📄 Request body:`, sanitizedBody);
  }

  // Override res.json to log response time
  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - start;
    console.log(
      `✅ ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Request ID: ${requestId}`
    );

    if (res.statusCode >= 400) {
      console.log(`❌ Error response:`, body);
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration = process.hrtime.bigint() - start;
    const ms = Number(duration) / 1000000; // Convert to milliseconds

    if (ms > 1000) {
      // Log slow requests (> 1 second)
      console.warn(
        `🐌 Slow request detected: ${req.method} ${req.path} - ${ms.toFixed(
          2
        )}ms`
      );
    }

    // Add performance header only if response hasn't been sent
    if (!res.headersSent) {
      res.set("X-Response-Time", `${ms.toFixed(2)}ms`);
    }
  });

  next();
};

/**
 * Rate limit error formatter
 */
export const rateLimitFormatter = (req, res) => {
  res.status(429).json({
    success: false,
    message: "بہت زیادہ درخواستیں، براہ کرم تھوڑی دیر بعد کوشش کریں", // Too many requests, please try again later
    errorCode: "RATE_LIMIT_EXCEEDED",
    retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    limit: req.rateLimit.limit,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime).toISOString(),
  });
};

/**
 * Content validation middleware
 */
export const validateContent = (req, res, next) => {
  // Check for potentially harmful content
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  const textFields = ["title", "content", "description", "review", "comment"];

  for (const field of textFields) {
    if (req.body[field]) {
      const content = req.body[field].toString();

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          return res.status(400).json({
            success: false,
            message: "مشکوک مواد کا پتہ چلا", // Suspicious content detected
            errorCode: "SUSPICIOUS_CONTENT",
            field: field,
          });
        }
      }
    }
  }

  next();
};

/**
 * File upload validation
 */
export const validateFileUpload = (req, res, next) => {
  if (req.files) {
    const allowedTypes = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
    };

    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      audio: 10 * 1024 * 1024, // 10MB
    };

    for (const [fieldName, files] of Object.entries(req.files)) {
      for (const file of Array.isArray(files) ? files : [files]) {
        const fileType = fieldName.includes("image") ? "image" : "audio";

        if (!allowedTypes[fileType].includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: `غلط فائل کی قسم: ${file.mimetype}`, // Invalid file type
            errorCode: "INVALID_FILE_TYPE",
            allowedTypes: allowedTypes[fileType],
          });
        }

        if (file.size > maxSizes[fileType]) {
          return res.status(400).json({
            success: false,
            message: `فائل بہت بڑی ہے`, // File too large
            errorCode: "FILE_TOO_LARGE",
            maxSize: `${maxSizes[fileType] / (1024 * 1024)}MB`,
          });
        }
      }
    }
  }

  next();
};

export default {
  validateObjectId,
  validateRequest,
  handleExternalAPIError,
  asyncHandler,
  requestLogger,
  performanceMonitor,
  rateLimitFormatter,
  validateContent,
  validateFileUpload,
};
