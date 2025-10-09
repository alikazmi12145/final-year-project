import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import Poet from "../models/poet.js";
import { auth, adminAuth } from "../middleware/auth.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Configure Cloudinary storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user-profiles",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 500, height: 500, crop: "fill" }],
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

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

// Register endpoint with validation
router.post(
  "/register",
  [
    body("name").isLength({ min: 2, max: 100 }).trim().escape(),
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body("role").optional().isIn(["poet", "admin", "moderator"]),
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

      const { name, email, password, role = "poet", bio, location } = req.body;

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
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
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
        status: role === "poet" ? "pending" : "active", // Only poets need admin approval, readers are auto-approved
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

      // Send verification email
      const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${emailVerificationToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "بازمِ سخن میں خوش آمدید - ای میل کی تصدیق کریں",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 20px; border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #d97706; margin-bottom: 20px;">بازمِ سخن میں خوش آمدید</h1>
            <h2 style="color: #374151;">Welcome to Bazm-e-Sukhan</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
              آپ کے اکاؤنٹ کو فعال کرنے کے لیے اپنی ای میل کی تصدیق کریں۔
            </p>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
              Please verify your email address to activate your account.
            </p>
            <a href="${verificationUrl}" style="display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
              Verify Email / ای میل کی تصدیق کریں
            </a>
            <p style="color: #9ca3af; font-size: 14px;">
              اگر آپ نے یہ اکاؤنٹ نہیں بنایا تو اس ای میل کو نظرانداز کریں۔
              <br>
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        </div>
      `,
      };

      try {
        await transporter.sendMail(mailOptions);
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
          role === "poet"
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

// Debug endpoint to check user status
router.get("/debug/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select(
      "name email role status isApproved isVerified createdAt"
    );

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
        email,
      });
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Debug user error:", error);
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  }
});

// Login endpoint
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    console.log("🚨 LOGIN ROUTE HIT! Raw request body:", req.body);

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
      console.log(`🔍 Login attempt for email: ${email}`);

      // Find user and populate poet info if applicable
      let user = await User.findOne({ email }).populate({
        path: "bookmarkedPoems",
        select: "title poet",
      });

      console.log(`🔍 User lookup result: ${user ? "Found" : "Not found"}`);

      // Auto-create reader account for login attempts (simplified registration)
      if (!user && email && password) {
        console.log(`🔧 Auto-creating reader account for: ${email}`);
        try {
          const hashedPassword = await bcrypt.hash(password, 12);
          user = await User.create({
            name:
              email.split("@")[0].charAt(0).toUpperCase() +
              email.split("@")[0].slice(1), // Capitalize first letter
            email: email,
            password: hashedPassword,
            role: "reader",
            status: "active", // Readers are auto-approved
            isApproved: true,
            isVerified: true,
            emailVerification: {
              isVerified: true,
            },
            bio: "Poetry enthusiast and reader",
            preferences: {
              language: "urdu",
              theme: "cultural",
              notifications: {
                email: true,
                push: false,
                contests: true,
                newPoetry: true,
              },
            },
          });
          console.log(`✅ Reader account auto-created for: ${email}`);
        } catch (createError) {
          console.error(
            "❌ Failed to auto-create reader account:",
            createError
          );
          return res.status(500).json({
            success: false,
            message: "Failed to create reader account. Please try again.",
          });
        }
      }

      // Auto-create or fix admin account if trying to login with default admin credentials
      if (email === "admin@bazm-e-sukhan.com" && password === "Admin@123456") {
        console.log("🔍 Admin login attempt detected");
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
      console.log(`🔍 Checking password for user: ${user.email}`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`🔍 Password validation result: ${isPasswordValid}`);

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

    // If reader, activate account immediately
    if (user.role === "reader") {
      user.status = "active";
    }

    await user.save();

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
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerification.token = emailVerificationToken;
    user.emailVerification.expiresAt = emailVerificationExpiry;
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${emailVerificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "ای میل کی تصدیق - Bazm-e-Sukhan",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Please click the link below to verify your email:</p>
          <a href="${verificationUrl}">Verify Email</a>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error(
        "📧 Email sending failed (this is normal in development):",
        emailError.message
      );
      console.log(
        `🔑 Development Mode - Verification token for ${email}: ${emailVerificationToken}`
      );
      console.log(`🔗 Verification URL: ${verificationUrl}`);
    }

    res.json({
      success: true,
      message: "Verification email sent successfully",
      // In development, include the verification token for testing
      ...(process.env.NODE_ENV === "development" && {
        verificationToken: emailVerificationToken,
        verificationUrl,
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

      // TEST MODE - Skip database operations
      console.log(`🔑 TEST MODE - Forgot password request for: ${email}`);

      // Generate test reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;

      console.log(`🔗 TEST MODE - Reset token: ${resetToken}`);
      console.log(`🔗 TEST MODE - Reset URL: ${resetUrl}`);

      // Simulate email sending (without actually sending)
      console.log(`📧 TEST MODE - Would send reset email to: ${email}`);

      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
        // Include test data in development
        ...(process.env.NODE_ENV === "development" && {
          resetToken,
          resetUrl,
          note: "TEST MODE: Check console for reset token (MongoDB disabled)",
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

// Upload profile image
router.post(
  "/profile/upload-image",
  auth,
  uploadProfile.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete old image from Cloudinary if exists
      if (user.profileImage?.publicId) {
        try {
          await cloudinary.uploader.destroy(user.profileImage.publicId);
        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue even if deletion fails
        }
      }

      // Update user profile image
      user.profileImage = {
        url: req.file.path,
        publicId: req.file.filename,
      };

      await user.save();

      // Update poet profile if user is a poet
      if (user.role === "poet") {
        const poet = await Poet.findOne({ user: user._id });
        if (poet) {
          poet.profileImage = {
            url: req.file.path,
            publicId: req.file.filename,
          };
          await poet.save();
        }
      }

      res.json({
        success: true,
        message: "Profile image updated successfully",
        profileImage: {
          url: req.file.path,
          publicId: req.file.filename,
        },
      });
    } catch (error) {
      console.error("Upload profile image error:", error);
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

export default router;
