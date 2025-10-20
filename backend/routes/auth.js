import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import Poet from "../models/poet.js";
import Poem from "../models/Poem.js";
import Collection from "../models/Collection.js";
import { auth, adminAuth } from "../middleware/auth.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import emailService from "../services/emailService.js";
import AuthController from "../controllers/authController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Check if Cloudinary is configured
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your-cloud-name" &&
  process.env.CLOUDINARY_API_KEY !== "your-api-key";

let uploadProfile;

if (isCloudinaryConfigured) {
  // Use Cloudinary if configured
  const { CloudinaryStorage } = await import("multer-storage-cloudinary");
  const cloudinary = (await import("../config/cloudinary.js")).default;

  const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "user-profiles",
      allowed_formats: ["jpg", "jpeg", "png", "gif"],
      transformation: [{ width: 500, height: 500, crop: "fill" }],
    },
  });

  uploadProfile = multer({
    storage: profileStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  console.log("✅ Using Cloudinary for image uploads");
} else {
  // Use local storage as fallback
  const uploadsDir = path.join(__dirname, "../uploads/profiles");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  uploadProfile = multer({
    storage: localStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Only image files are allowed!"));
      }
    },
  });

  console.log(
    "⚠️ Using local storage for image uploads (Cloudinary not configured)"
  );
}

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// Test email configuration endpoint
router.get("/test-email", async (req, res) => {
  try {
    const result = await emailService.testEmailConfig();
    res.json({
      success: result.success,
      message: result.message,
      emailConfigured: result.success,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email test failed",
      error: error.message,
    });
  }
});

// Register endpoint with validation
router.post(
  "/register",
  [
    body("name").isLength({ min: 2, max: 100 }).trim().escape(),
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body("role").optional().isIn(["reader", "poet", "admin", "moderator"]),
    body("bio").optional().isLength({ max: 500 }).trim(),
    body("location.city").optional().trim(),
    body("location.country").optional().trim(),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        name,
        email,
        password,
        role = "reader",
        bio,
        location,
      } = req.body;

      // Check if user already exists
      let existingUser;
      try {
        existingUser = await User.findOne({ email });
      } catch (dbError) {
        console.error("Database query error:", dbError);
        return res.status(500).json({
          success: false,
          message: "Database connection error. Please try again later.",
        });
      }

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = emailService.generateVerificationToken();
      const emailVerificationExpiry = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ); // 24 hours

      // Create user
      const userData = {
        name,
        email,
        password: hashedPassword,
        role,
        bio,
        location,
        emailVerification: {
          token: emailVerificationToken,
          expiresAt: emailVerificationExpiry,
        },
        status: role === "reader" ? "active" : "pending", // Readers are auto-approved, poets need approval
        isApproved: role === "reader", // Auto-approve readers
      };

      const user = new User(userData);
      try {
        await user.save();
      } catch (saveError) {
        console.error("User save error:", saveError);
        return res.status(500).json({
          success: false,
          message: "Failed to create user account. Please try again.",
        });
      }

      // Create poet profile if role is poet
      if (role === "poet") {
        const poet = new Poet({
          name,
          bio,
          era: "contemporary",
          user: user._id,
          status: "pending",
        });
        try {
          await poet.save();
        } catch (poetError) {
          console.error("Poet profile creation error:", poetError);
          // Continue with user creation even if poet profile fails
        }
      }

      // Send verification email using new email service
      try {
        const emailResult = await emailService.sendVerificationEmail(
          user,
          emailVerificationToken
        );
        if (emailResult.success) {
          console.log(`✅ Verification email sent to ${email}`);
        } else {
          console.log(
            `⚠️ Email service not configured, using mock email for ${email}`
          );
        }
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Continue with registration even if email fails
      }

      // Optionally auto-login reader accounts (and poets pending) for improved UX
      // Provide tokens so current frontend (expecting token) works.
      const { accessToken, refreshToken } = generateTokens(user);

      res.status(201).json({
        success: true,
        message:
          role === "reader"
            ? "Account created successfully. Please verify your email."
            : role === "poet"
            ? "Account created successfully. Please verify your email and wait for admin approval."
            : "Account created successfully. Please verify your email.",
        requiresApproval: role === "poet",
        accessToken,
        refreshToken,
        token: accessToken, // backward compatibility for frontend expecting 'token'
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Registration failed. Please try again.",
      });
    }
  }
);

// Login endpoint
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          message: "Invalid email or password format",
        });
      }

      const { email, password } = req.body;

      // Find user and populate poet info if applicable
      let user = await User.findOne({ email }).populate({
        path: "bookmarkedPoems",
        select: "title poet",
      });

      // Auto-create reader account for login attempts (simplified registration)
      if (!user && email && password) {
        console.log(`🔧 Auto-creating reader account for: ${email}`);
        try {
          const hashedPassword = await bcrypt.hash(password, 12);

          // Create user with minimal required fields first
          const userData = {
            name:
              email.split("@")[0].charAt(0).toUpperCase() +
              email.split("@")[0].slice(1),
            email: email,
            password: hashedPassword,
            role: "reader",
            status: "active",
            isApproved: true,
            isVerified: true,
            bio: "Poetry enthusiast and reader",
          };

          // Create user object and set nested fields properly
          user = new User(userData);

          // Set emailVerification object
          user.emailVerification = {
            isVerified: true,
          };

          // Set preferences object
          user.preferences = {
            language: "urdu",
            theme: "cultural",
            notifications: {
              email: true,
              push: false,
              contests: true,
              newPoetry: true,
            },
          };

          await user.save();
          console.log(`✅ Reader account auto-created for: ${email}`);
        } catch (createError) {
          console.error(
            "❌ Failed to auto-create reader account:",
            createError
          );
          console.error("❌ Error details:", createError.message);
          return res.status(500).json({
            success: false,
            message: "Failed to create reader account. Please try again.",
          });
        }
      }

      // Auto-create or fix admin account if trying to login with default admin credentials
      if (email === "admin@bazm-e-sukhan.com" && password === "Admin@123456") {
        if (!user) {
          console.log("🔧 Auto-creating admin account on first login...");

          const hashedPassword = await bcrypt.hash(password, 12);
          user = await User.create({
            name: "Platform Administrator",
            email: email,
            password: hashedPassword,
            role: "admin",
            status: "active",
            isApproved: true,
            isVerified: true,
            emailVerification: {
              isVerified: true,
            },
            bio: "System Administrator of Bazm-e-Sukhan platform",
            preferences: {
              language: "urdu",
              theme: "cultural",
              notifications: {
                email: true,
                push: true,
                contests: true,
                newPoetry: true,
              },
            },
          });

          console.log("✅ Admin account auto-created successfully!");
        } else {
          console.log(
            `🔍 Admin user exists - Role: ${user.role}, Status: ${user.status}`
          );
          if (user.role !== "admin" || user.status !== "active") {
            // Fix existing user to be admin
            console.log("🔧 Fixing existing user to be admin...");
            user.role = "admin";
            user.status = "active";
            user.isApproved = true;
            user.isVerified = true;
            if (!user.emailVerification) {
              user.emailVerification = {};
            }
            user.emailVerification.isVerified = true;
            await user.save();
            console.log("✅ User role updated to admin!");
          }
        }
      }

      if (!user) {
        console.log("❌ User not found for email:", email);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Check password

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.log("❌ Invalid password for user:", email);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      console.log(
        `🔍 User login attempt - Email: ${user.email}, Role: ${user.role}, Status: ${user.status}, IsApproved: ${user.isApproved}`
      );

      // Check if account is active (skip checks for admin)
      if (user.role !== "admin") {
        if (user.status === "suspended") {
          console.log("❌ Login denied - Account suspended");
          return res.status(403).json({
            success: false,
            message: "Your account has been suspended. Please contact support.",
            suspendedUntil: user.suspendedUntil,
          });
        }

        if (user.status === "banned") {
          console.log("❌ Login denied - Account banned");
          return res.status(403).json({
            success: false,
            message: "Your account has been banned. Please contact support.",
          });
        }

        if (user.status === "pending") {
          if (user.role === "poet") {
            console.log("❌ Login denied - Poet account pending approval");
            return res.status(403).json({
              success: false,
              message:
                "Your poet account is pending admin approval. Please wait for approval.",
              code: "POET_PENDING_APPROVAL",
            });
          } else if (user.role === "reader") {
            console.log("❌ Login denied - Reader account pending approval");
            return res.status(403).json({
              success: false,
              message:
                "Your reader account is pending admin approval. Please wait for approval.",
              code: "READER_PENDING_APPROVAL",
            });
          }
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Update login history
      const loginEntry = {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        loginTime: new Date(),
      };

      user.loginHistory.unshift(loginEntry);
      if (user.loginHistory.length > 10) {
        user.loginHistory = user.loginHistory.slice(0, 10);
      }

      user.lastActive = new Date();
      await user.save();

      // Get poet info if user is a poet
      let poetInfo = null;
      if (user.role === "poet") {
        poetInfo = await Poet.findOne({ user: user._id });
      }

      res.json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        token: accessToken, // backward compatibility alias
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isApproved: user.isApproved,
          status: user.status,
          profileImage: user.profileImage,
          bio: user.bio,
          location: user.location,
          preferences: user.preferences,
          stats: user.stats,
          verificationBadge: user.verificationBadge,
          poetInfo: poetInfo,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Login failed. Please try again.",
      });
    }
  }
);

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

// Verify email endpoint
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      "emailVerification.token": token,
      "emailVerification.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.emailVerification.isVerified = true;
    user.emailVerification.token = undefined;
    user.emailVerification.expiresAt = undefined;
    user.isVerified = true; // Update main isVerified field

    // If reader, activate account immediately
    if (user.role === "reader") {
      user.status = "active";
    }

    await user.save();

    // Send welcome email after verification
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
      // Continue even if welcome email fails
    }

    res.json({
      success: true,
      message: "Email verified successfully",
      requiresApproval: user.role === "poet" && user.status === "pending",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Email verification failed",
    });
  }
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerification.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    // Generate new token
    const emailVerificationToken = emailService.generateVerificationToken();
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerification.token = emailVerificationToken;
    user.emailVerification.expiresAt = emailVerificationExpiry;
    await user.save();

    // Send verification email using new service
    try {
      const emailResult = await emailService.sendVerificationEmail(
        user,
        emailVerificationToken
      );
      console.log(
        `✅ Verification email sent to ${email} - Result:`,
        emailResult.success
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.json({
      success: true,
      message: "Verification email sent successfully",
      // In development, include the verification token for testing
      ...(process.env.NODE_ENV === "development" && {
        verificationToken: emailVerificationToken,
        note: "Development mode: Check console for verification token",
      }),
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
});

// Forgot password
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return res.json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = emailService.generateResetToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordReset = {
        token: resetToken,
        expiresAt: resetExpiry,
      };
      await user.save();

      // Send password reset email
      try {
        const emailResult = await emailService.sendPasswordResetEmail(
          user,
          resetToken
        );
        console.log(
          `✅ Password reset email sent to ${email} - Result:`,
          emailResult.success
        );
      } catch (emailError) {
        console.error("Password reset email failed:", emailError);
      }

      res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
        // Include test data in development
        ...(process.env.NODE_ENV === "development" && {
          resetToken,
          note: "Development mode: Check console for reset token",
        }),
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request",
      });
    }
  }
);

// Reset password
router.post(
  "/reset-password",
  [
    body("token").notEmpty(),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        "passwordReset.token": token,
        "passwordReset.expiresAt": { $gt: new Date() },
        "passwordReset.usedAt": { $exists: false },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      user.password = hashedPassword;
      user.passwordReset.usedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
      });
    }
  }
);

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("bookmarkedPoems", "title poet category")
      .select("-password -passwordReset -emailVerification");

    let poetInfo = null;
    if (user.role === "poet") {
      poetInfo = await Poet.findOne({ user: user._id });
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        poetInfo,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user information",
    });
  }
});

// Update profile
router.put(
  "/profile",
  auth,
  [
    body("name").optional().isLength({ min: 2, max: 100 }).trim(),
    body("bio").optional().isLength({ max: 500 }).trim(),
    body("location.city").optional().trim(),
    body("location.country").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, bio, location, preferences } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user fields
      if (name) user.name = name;
      if (bio !== undefined) user.bio = bio;
      if (location) user.location = { ...user.location, ...location };
      if (preferences)
        user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      // Update poet profile if user is a poet
      if (user.role === "poet") {
        const poet = await Poet.findOne({ user: user._id });
        if (poet) {
          if (name) poet.name = name;
          if (bio !== undefined) poet.bio = bio;
          await poet.save();
        }
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          bio: user.bio,
          location: user.location,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
      });
    }
  }
);

// Update notification settings
router.put("/profile/notifications", auth, async (req, res) => {
  try {
    const { notificationSettings } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update notification settings
    if (notificationSettings) {
      user.preferences = user.preferences || {};
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notificationSettings,
      };
    }

    await user.save();

    // Send confirmation email if email notifications are enabled
    if (notificationSettings.emailNotifications && user.email) {
      try {
        await emailService.sendNotificationSettingsUpdate(
          user.email,
          user.name,
          notificationSettings
        );
      } catch (emailError) {
        console.error(
          "Failed to send notification settings email:",
          emailError
        );
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: "Notification settings updated successfully",
      notificationSettings: user.preferences.notifications,
    });
  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification settings",
    });
  }
});

// Send test email
router.post("/profile/test-email", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "No email address found",
      });
    }

    // Check if email notifications are enabled
    const emailNotificationsEnabled =
      user.preferences?.notifications?.emailNotifications !== false;

    if (!emailNotificationsEnabled) {
      return res.status(400).json({
        success: false,
        message: "Email notifications are disabled",
      });
    }

    // Send test email
    await emailService.sendTestEmail(user.email, user.name);

    res.json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error) {
    console.error("Send test email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
    });
  }
});

// Upload profile image
router.post(
  "/profile/upload-image",
  auth,
  uploadProfile.single("avatar"),
  async (req, res) => {
    try {
      console.log("📸 Upload request received");
      console.log("User ID:", req.user.userId);
      console.log("File:", req.file ? "✅ Present" : "❌ Missing");

      if (!req.file) {
        console.log("❌ No file in request");
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      console.log("File details:", {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      const user = await User.findById(req.user.userId);
      if (!user) {
        console.log("❌ User not found:", req.user.userId);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      let imageUrl, imagePublicId;

      if (isCloudinaryConfigured) {
        console.log("☁️ Using Cloudinary storage");
        // Delete old image from Cloudinary if exists
        if (user.profileImage?.publicId) {
          try {
            const cloudinary = (await import("../config/cloudinary.js"))
              .default;
            await cloudinary.uploader.destroy(user.profileImage.publicId);
            console.log("🗑️ Deleted old Cloudinary image");
          } catch (deleteError) {
            console.error("Error deleting old image:", deleteError);
            // Continue even if deletion fails
          }
        }

        imageUrl = req.file.path;
        imagePublicId = req.file.filename;
      } else {
        console.log("💾 Using local storage");
        // Delete old local image if exists
        if (
          user.profileImage?.publicId &&
          !user.profileImage.publicId.startsWith("http")
        ) {
          try {
            const oldImagePath = path.join(
              __dirname,
              "../uploads/profiles",
              user.profileImage.publicId
            );
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log("🗑️ Deleted old local image");
            }
          } catch (deleteError) {
            console.error("Error deleting old local image:", deleteError);
            // Continue even if deletion fails
          }
        }

        // Use relative URL path for local storage
        imageUrl = `/uploads/profiles/${req.file.filename}`;
        imagePublicId = req.file.filename;
      }

      console.log("📝 Updating user profile with image URL:", imageUrl);

      // Update user profile image
      user.profileImage = {
        url: imageUrl,
        publicId: imagePublicId,
      };

      await user.save();
      console.log("✅ User profile updated");

      // Update poet profile if user is a poet
      if (user.role === "poet") {
        const poet = await Poet.findOne({ user: user._id });
        if (poet) {
          poet.profileImage = {
            url: imageUrl,
            publicId: imagePublicId,
          };
          await poet.save();
          console.log("✅ Poet profile updated");
        }
      }

      console.log("🎉 Upload successful!");

      res.json({
        success: true,
        message: "Profile image updated successfully",
        profileImage: {
          url: imageUrl,
          publicId: imagePublicId,
        },
      });
    } catch (error) {
      console.error("❌ Upload profile image error:", error);
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to upload profile image",
        error: error.message,
      });
    }
  }
);

// Change password
router.put(
  "/change-password",
  auth,
  [
    body("currentPassword").notEmpty(),
    body("newPassword")
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedPassword;
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to change password",
      });
    }
  }
);

// Logout (client-side token removal, but we can log it)
router.post("/logout", auth, async (req, res) => {
  try {
    // Update last active time
    await User.findByIdAndUpdate(req.user.userId, {
      lastActive: new Date(),
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

// Get user statistics
router.get("/user-stats", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's poems and calculate stats
    const userPoems = await Poem.find({ author: userId });
    const likedPoems = await Poem.find({ likes: userId });
    const bookmarkedPoems = await Collection.findOne({
      name: "Favorites",
      createdBy: userId,
    }).populate("poems");

    // Calculate total views from user's poems
    const totalViews = userPoems.reduce(
      (sum, poem) => sum + (poem.views || 0),
      0
    );

    res.json({
      success: true,
      stats: {
        poemsRead: likedPoems.length, // Using liked poems as proxy for read poems
        likedPoems: likedPoems.length,
        bookmarks: bookmarkedPoems?.poems?.length || 0,
        totalViews: totalViews,
        poemsCreated: userPoems.length,
        publishedPoems: userPoems.filter((poem) => poem.status === "published")
          .length,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
    });
  }
});

// Get user recent activity
router.get("/user-activity", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get recent poems created by user
    const recentPoems = await Poem.find({ author: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title createdAt status");

    // Get recently liked poems
    const recentLikes = await Poem.find({ likes: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("title updatedAt author")
      .populate("author", "name");

    // Get recently bookmarked poems
    const userFavorites = await Collection.findOne({
      name: "Favorites",
      createdBy: userId,
    }).populate({
      path: "poems",
      options: { sort: { updatedAt: -1 }, limit: 5 },
      select: "title updatedAt author",
      populate: { path: "author", select: "name" },
    });

    const activity = [];

    // Add poem creation activities
    recentPoems.forEach((poem) => {
      activity.push({
        id: `poem_created_${poem._id}`,
        type: "poem_created",
        title: `Created "${poem.title}"`,
        time: poem.createdAt,
        icon: "FileText",
      });
    });

    // Add like activities
    recentLikes.forEach((poem) => {
      activity.push({
        id: `poem_liked_${poem._id}`,
        type: "poem_liked",
        title: `Liked "${poem.title}"`,
        time: poem.updatedAt,
        icon: "Heart",
      });
    });

    // Add bookmark activities
    if (userFavorites?.poems) {
      userFavorites.poems.forEach((poem) => {
        activity.push({
          id: `poem_bookmarked_${poem._id}`,
          type: "poem_bookmarked",
          title: `Bookmarked "${poem.title}"`,
          time: poem.updatedAt,
          icon: "Bookmark",
        });
      });
    }

    // Sort by time and limit to 10 most recent
    const sortedActivity = activity
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10);

    res.json({
      success: true,
      activity: sortedActivity,
    });
  } catch (error) {
    console.error("Get user activity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user activity",
    });
  }
});

// Create admin route
router.post("/create-admin", AuthController.createAdmin);

export default router;
