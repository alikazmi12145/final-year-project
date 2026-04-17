import jwt from "jsonwebtoken";
import User from "../models/User.js";
import rateLimit from "express-rate-limit";

// Basic authentication middleware
export const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found.",
      });
    }

    // Check if user account is active
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
        suspendedUntil: user.suspendedUntil,
      });
    }

    if (user.status === "banned") {
      return res.status(403).json({
        success: false,
        message: "Account banned",
      });
    }

    // Check if poet or moderator account is pending approval
    if (user.status === "pending" && (user.role === "poet" || user.role === "moderator")) {
      return res.status(403).json({
        success: false,
        message: user.role === "poet" 
          ? "شاعر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں"
          : "موڈریٹر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
        code: "PENDING_APPROVAL",
        role: user.role,
      });
    }

    // Check if reader account is pending approval
    if (user.status === "pending" && user.role === "reader") {
      return res.status(403).json({
        success: false,
        message: "قاری اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
        code: "PENDING_APPROVAL",
        role: user.role,
      });
    }

    // Additional check: Verify poet/moderator is approved even if status is active
    if ((user.role === "poet" || user.role === "moderator") && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: user.role === "poet"
          ? "شاعر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں"
          : "موڈریٹر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
        code: "PENDING_APPROVAL",
        role: user.role,
      });
    }

    // Additional check: Verify reader is approved even if status is active
    if (user.role === "reader" && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "قاری اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
        code: "PENDING_APPROVAL",
        role: user.role,
      });
    }

    // Update last active time
    user.lastActive = new Date();
    await user.save();

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      status: user.status,
      verificationBadge: user.verificationBadge,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
        userRole: req.user.role,
        requiredRoles: roles,
      });
    }

    next();
  };
};

// Admin-only authorization
export const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found.",
      });
    }

    // Check if user is an admin
    if (user.role !== "admin") {
      console.log(`⛔ adminAuth rejected: user ${user.email} has role '${user.role}', not 'admin'`);
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    // Check if admin account is active
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Admin account is not active",
      });
    }

    // Update last active time
    user.lastActive = new Date();
    await user.save();

    req.user = {
      _id: user._id,
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      status: user.status,
      verificationBadge: user.verificationBadge,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Moderator or Admin authorization
export const moderatorAuth = [auth, authorize("admin", "moderator")];

// Poet authorization (approved poets only)
export const poetAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found.",
      });
    }

    // Check if user is a poet
    if (user.role !== "poet") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Poet role required.",
      });
    }

    // Check if poet account is approved
    if (!user.isApproved || user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Poet account is not approved or active",
      });
    }

    // Update last active time
    user.lastActive = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user && user.status === "active") {
        req.user = {
          userId: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          status: user.status,
        };
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Email verification required
export const emailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const user = User.findById(req.user.userId);
  if (!user.emailVerification.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  next();
};

// Account status verification
export const activeAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Account not active",
      status: req.user.status,
    });
  }

  next();
};

// Rate limiting middleware
export const createRateLimit = (
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests"
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === "admin";
    },
  });
};

// Specific rate limits
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  "Too many authentication attempts, please try again later"
);

export const registrationRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  5, // limit each IP to 5 registration attempts per hour
  "Too many registration attempts, please try again later"
);

export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // limit each IP to 3 password reset attempts per hour
  "Too many password reset attempts, please try again later"
);

// Content creation rate limiting
export const contentCreationRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // limit to 20 content creations per hour
  "Too many content creation attempts, please slow down"
);

// Permission-based middleware
export const canModerateContent = [
  auth,
  (req, res, next) => {
    const allowedRoles = ["admin", "moderator"];
    const hasPermission =
      allowedRoles.includes(req.user.role) ||
      (req.user.role === "poet" && req.user.verificationBadge !== "none");

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to moderate content",
      });
    }

    next();
  },
];

export const canManageContests = [
  auth,
  (req, res, next) => {
    const allowedRoles = ["admin", "moderator"];
    const hasPermission =
      allowedRoles.includes(req.user.role) ||
      (req.user.role === "poet" && req.user.verificationBadge === "gold");

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to manage contests",
      });
    }

    next();
  },
];

// Content ownership verification
export const verifyOwnership = (Model, param = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[param];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      // Check if user owns the resource or is admin/moderator
      const isOwner =
        resource.author && resource.author.equals(req.user.userId);
      const canModify = ["admin", "moderator"].includes(req.user.role);

      if (!isOwner && !canModify) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You don't own this resource.",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error verifying resource ownership",
      });
    }
  };
};

// Validation middleware for user input
export const validateUserInput = (validations) => {
  return async (req, res, next) => {
    try {
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Validation error",
      });
    }
  };
};

// ============= APPROVAL CHECKING MIDDLEWARE =============

/**
 * Middleware to check if user is approved for dashboard access
 * Applies to poets and moderators only
 */
export const requireApproval = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check approval status for poets and moderators
    if (user.role === "poet" || user.role === "moderator") {
      if (!user.isApproved || user.status !== "active") {
        return res.status(403).json({
          success: false,
          message:
            user.role === "poet"
              ? "آپ کا شاعر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں"
              : "آپ کا موڈریٹر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
          code: "APPROVAL_REQUIRED",
          role: user.role,
          approvalStatus: {
            isApproved: user.isApproved,
            status: user.status,
            canAccessDashboard: false,
          },
        });
      }
    }

    // All other roles (reader, admin) or approved poets/moderators can proceed
    next();
  } catch (error) {
    console.error("Approval check error:", error);
    res.status(500).json({
      success: false,
      message: "Approval verification failed",
    });
  }
};

/**
 * Combined middleware: Authentication + Approval check
 */
export const authWithApproval = [auth, requireApproval];

/**
 * Dashboard access middleware for different roles
 */
export const poetDashboardAuth = [auth, requireApproval];
export const moderatorDashboardAuth = [auth, requireApproval];
export const readerDashboardAuth = [auth]; // Readers don't need approval
export const adminDashboardAuth = [adminAuth]; // Admins use existing adminAuth

// Legacy exports for backward compatibility
export const authenticate = auth;
export const protect = auth; // Alias for protect middleware
