import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

/**
 * Authentication Controller for Bazm-E-Sukhan Platform
 * Handles user registration, login, password reset, email verification, and OAuth
 */

class AuthController {
  // ============= USER REGISTRATION =============

  /**
   * Register new user
   */
  static async register(req, res) {
    try {
      const {
        username,
        email,
        password,
        confirmPassword,
        role = "reader",
        profile = {},
      } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "تمام ضروری فیلڈز کو بھریں",
          errors: {
            username: !username ? "صارف نام ضروری ہے" : null,
            email: !email ? "ای میل ضروری ہے" : null,
            password: !password ? "پاس ورڈ ضروری ہے" : null,
          },
        });
      }

      // Password confirmation check
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ اور تصدیقی پاس ورڈ میں فرق ہے",
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ کم سے کم 8 حروف کا ہونا چاہیے",
        });
      }

      // Password complexity validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ میں بڑا حرف، چھوٹا حرف، نمبر اور خاص علامت ہونی چاہیے",
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "غلط ای میل فارمیٹ",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "یہ ای میل پہلے سے رجسٹرڈ ہے",
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");

      // Determine approval status based on role
      // Readers and admins are auto-approved, poets and moderators need admin approval
      const needsApproval = role === "poet" || role === "moderator";
      const userStatus = needsApproval ? "pending" : "active";
      const isApproved = !needsApproval;

      // Create new user
      const newUser = new User({
        name: profile.fullName?.trim() || username.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role,
        bio: profile.bio?.trim(),
        location: profile.location
          ? {
              city: profile.location?.trim(),
            }
          : undefined,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        socialLinks: profile.socialLinks || {},
        status: userStatus,
        isApproved: isApproved,
        isVerified: false,
        emailVerification: {
          isVerified: false,
          token: emailVerificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      await newUser.save();

      // Send verification email
      try {
        await AuthController.sendVerificationEmail(
          newUser.email,
          emailVerificationToken
        );
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't fail registration if email fails
      }

      // Remove password from response
      const userResponse = newUser.toObject();
      delete userResponse.password;
      delete userResponse.emailVerificationToken;

      // Set appropriate message based on approval requirement
      let message = "اکاؤنٹ کامیابی سے بن گیا، ای میل کی تصدیق کریں";
      if (needsApproval) {
        message =
          role === "poet"
            ? "شاعر اکاؤنٹ بن گیا! ایڈمن کی منظوری کا انتظار کریں۔ منظوری کے بعد ڈیش بورڈ تک رسائی ملے گی"
            : "موڈریٹر اکاؤنٹ بن گیا! ایڈمن کی منظوری کا انتظار کریں۔ منظوری کے بعد ڈیش بورڈ تک رسائی ملے گی";
      }

      // Generate JWT token only for users who don't need approval
      // For poets and moderators, token will be generated only after admin approval during login
      let token = null;
      if (!needsApproval) {
        token = jwt.sign(
          {
            userId: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
      }

      res.status(201).json({
        success: true,
        message: message,
        user: userResponse,
        token, // Will be null for poets/moderators awaiting approval
        requiresApproval: needsApproval,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "رجسٹریشن میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= USER LOGIN =============

  /**
   * User login
   */
  static async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "ای میل اور پاس ورڈ ضروری ہیں",
        });
      }

      // Find user by email
      const user = await User.findOne({
        email: email.toLowerCase(),
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "غلط ای میل یا پاس ورڈ",
        });
      }

      // LOG USER STATUS FOR DEBUGGING
      console.log("🔍 Login attempt:", {
        email: user.email,
        role: user.role,
        status: user.status,
        isApproved: user.isApproved,
      });

      // CRITICAL: Check approval status FIRST for poets and moderators
      if (user.role === "poet" || user.role === "moderator") {
        if (!user.isApproved || user.status !== "active") {
          console.log("❌ Login blocked: Poet/Moderator not approved");
          return res.status(403).json({
            success: false,
            message:
              user.role === "poet"
                ? "آپ کا شاعر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں"
                : "آپ کا موڈریٹر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
            code: "PENDING_APPROVAL",
            role: user.role,
          });
        }
      }

      // Check if account is active
      if (user.status !== "active") {
        // Auto-approve pending admin accounts (they should have been approved during registration)
        if (
          user.role === "admin" &&
          user.status === "pending" &&
          !user.isApproved
        ) {
          user.status = "active";
          user.isApproved = true;
          user.approvedAt = new Date();
          await user.save();
          console.log(`🔧 Auto-approved admin account: ${user.email}`);
        }
        // Special message for pending approval for poets and moderators
        else if (
          user.status === "pending" &&
          !user.isApproved &&
          (user.role === "poet" || user.role === "moderator")
        ) {
          return res.status(403).json({
            success: false,
            message:
              user.role === "poet"
                ? "آپ کا شاعر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں"
                : "آپ کا موڈریٹر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
            code: "PENDING_APPROVAL",
            role: user.role,
          });
        }
        // Still not active after auto-approval attempt
        else if (user.status !== "active") {
          return res.status(401).json({
            success: false,
            message: "آپ کا اکاؤنٹ غیر فعال ہے، ایڈمن سے رابطہ کریں",
          });
        }
      }

      // Additional check for approval status for poets and moderators
      if (
        (user.role === "poet" || user.role === "moderator") &&
        !user.isApproved
      ) {
        return res.status(403).json({
          success: false,
          message:
            user.role === "poet"
              ? "آپ کا شاعر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں"
              : "آپ کا موڈریٹر اکاؤنٹ ابھی منظور نہیں ہوا۔ ایڈمن کی منظوری کا انتظار کریں",
          code: "PENDING_APPROVAL",
          role: user.role,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "غلط ای میل یا پاس ورڈ",
        });
      }

      // Update last active time
      user.lastActive = new Date();
      await user.save();

      // Admin users are handled through the User model
      if (user.role === "admin") {
        console.log(`✅ Admin login successful: ${user.email}`);
      }

      // Generate JWT token
      const tokenExpiry = rememberMe ? "30d" : "7d";
      const token = jwt.sign(
        {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      // Remove sensitive data from response
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.emailVerificationToken;
      delete userResponse.passwordResetToken;
      delete userResponse.passwordResetExpires;

      res.json({
        success: true,
        message: "کامیابی سے لاگ ان ہوئے",
        user: userResponse,
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "لاگ ان میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= PASSWORD RESET =============

  /**
   * Request password reset
   */
  static async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "ای میل ضروری ہے",
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if email exists for security
        return res.json({
          success: true,
          message: "اگر یہ ای میل رجسٹرڈ ہے تو پاس ورڈ ری سیٹ لنک بھیج دیا گیا",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpiry;
      await user.save();

      // Send reset email
      try {
        await AuthController.sendPasswordResetEmail(user.email, resetToken);

        res.json({
          success: true,
          message: "پاس ورڈ ری سیٹ لنک آپ کے ای میل پر بھیج دیا گیا",
        });
      } catch (emailError) {
        console.error("Password reset email failed:", emailError);
        res.status(500).json({
          success: false,
          message: "ای میل بھیجنے میں خرابی ہوئی",
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({
        success: false,
        message: "پاس ورڈ ری سیٹ درخواست میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "تمام فیلڈز ضروری ہیں",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ اور تصدیقی پاس ورڈ میں فرق ہے",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ کم سے کم 8 حروف کا ہونا چاہیے",
        });
      }

      // Password complexity validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ میں بڑا حرف، چھوٹا حرف، نمبر اور خاص علامت ہونی چاہیے",
        });
      }

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "غلط یا منتہی الوقت ٹوکن",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user
      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordChangedAt = new Date();
      user.failedLoginAttempts = 0;
      user.accountLocked = false;
      user.accountLockedUntil = null;

      await user.save();

      res.json({
        success: true,
        message: "پاس ورڈ کامیابی سے تبدیل ہو گیا",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({
        success: false,
        message: "پاس ورڈ ری سیٹ میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= EMAIL VERIFICATION =============

  /**
   * Verify email address
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "ٹوکن ضروری ہے",
        });
      }

      const user = await User.findOne({ emailVerificationToken: token });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "غلط تصدیقی ٹوکن",
        });
      }

      if (user.isEmailVerified) {
        return res.json({
          success: true,
          message: "ای میل پہلے سے تصدیق شدہ ہے",
        });
      }

      // Verify email
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerifiedAt = new Date();

      await user.save();

      res.json({
        success: true,
        message: "ای میل کامیابی سے تصدیق ہو گئی",
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        success: false,
        message: "ای میل تصدیق میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "ای میل ضروری ہے",
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      if (user.isEmailVerified) {
        return res.json({
          success: true,
          message: "ای میل پہلے سے تصدیق شدہ ہے",
        });
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationToken = emailVerificationToken;
      await user.save();

      // Send verification email
      try {
        await AuthController.sendVerificationEmail(
          user.email,
          emailVerificationToken
        );

        res.json({
          success: true,
          message: "تصدیقی ای میل دوبارہ بھیج دیا گیا",
        });
      } catch (emailError) {
        console.error("Verification email failed:", emailError);
        res.status(500).json({
          success: false,
          message: "ای میل بھیجنے میں خرابی ہوئی",
        });
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "تصدیقی ای میل بھیجنے میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= PROFILE MANAGEMENT =============

  /**
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select(
        "-password -emailVerificationToken -passwordResetToken"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "پروفائل حاصل کرنے میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated here
      delete updateData.password;
      delete updateData.email;
      delete updateData.role;
      delete updateData.isActive;
      delete updateData.isEmailVerified;

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select("-password -emailVerificationToken -passwordResetToken");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      res.json({
        success: true,
        message: "پروفائل کامیابی سے اپ ڈیٹ ہوئی",
        user,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "پروفائل اپ ڈیٹ کرنے میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "تمام فیلڈز ضروری ہیں",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "نیا پاس ورڈ اور تصدیقی پاس ورڈ میں فرق ہے",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "نیا پاس ورڈ کم سے کم 8 حروف کا ہونا چاہیے",
        });
      }

      // Password complexity validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "نیا پاس ورڈ میں بڑا حرف، چھوٹا حرف، نمبر اور خاص علامت ہونی چاہیے",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "موجودہ پاس ورڈ غلط ہے",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: "پاس ورڈ کامیابی سے تبدیل ہو گیا",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "پاس ورڈ تبدیل کرنے میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= LOGOUT =============

  /**
   * User logout
   */
  static async logout(req, res) {
    try {
      const userId = req.user.id;

      // Update last active time
      await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });

      res.json({
        success: true,
        message: "کامیابی سے لاگ آؤٹ ہوئے",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "لاگ آؤٹ میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= EMAIL UTILITIES =============

  /**
   * Send verification email
   */
  static async sendVerificationEmail(email, token) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "بذم سخن - ای میل کی تصدیق",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">بذم سخن میں خوش آمدید</h2>
          <p>آپ کے اکاؤنٹ کی تصدیق کے لیے نیچے دیے گئے لنک پر کلک کریں:</p>
          <a href="${verificationUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ای میل کی تصدیق کریں</a>
          <p style="margin-top: 20px;">اگر آپ نے یہ اکاؤنٹ نہیں بنایا تو اس ای میل کو نظرانداز کریں۔</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email, token) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "بذم سخن - پاس ورڈ ری سیٹ",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">پاس ورڈ ری سیٹ کریں</h2>
          <p>اپنا نیا پاس ورڈ سیٹ کرنے کے لیے نیچے دیے گئے لنک پر کلک کریں:</p>
          <a href="${resetUrl}" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">نیا پاس ورڈ سیٹ کریں</a>
          <p style="margin-top: 20px;">یہ لنک 1 گھنٹے کے لیے درست ہے۔</p>
          <p>اگر آپ نے یہ درخواست نہیں کی تو اس ای میل کو نظرانداز کریں۔</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  // ============= ADMIN CREATION =============

  /**
   * Create admin user (Super Admin only or initial setup)
   */
  static async createAdmin(req, res) {
    try {
      const {
        username,
        email,
        password,
        fullName,
        bio = "System Administrator",
        isSuperAdmin = false,
      } = req.body;

      // Check if this is initial setup (no admin exists)
      const existingAdmins = await User.countDocuments({ role: "admin" });
      const isInitialSetup = existingAdmins === 0;

      // If not initial setup, check if current user is super admin
      if (!isInitialSetup) {
        if (!req.user || req.user.role !== "admin" || !req.user.isSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: "صرف سپر ایڈمن نئے ایڈمن بنا سکتے ہیں",
          });
        }
      }

      // Validation
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: "تمام ضروری فیلڈز کو بھریں",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "یہ ای میل پہلے سے رجسٹرڈ ہے",
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create admin user
      const admin = new User({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "admin",
        bio: bio.trim(),
        status: "active",
        isApproved: true,
        isVerified: true,
        emailVerification: {
          isVerified: true,
        },
      });

      await admin.save();

      // Create admin record in Admin collection
      try {
        const adminRecord = new Admin({
          user: admin._id,
          permissions: {
            canManageUsers: isInitialSetup,
            canManagePoets: true,
            canManagePoems: true,
            canManageContests: true,
            canManageNews: true,
            canManageQuizzes: true,
            canManageReviews: true,
            canManageCollections: true,
            canManageReports: isInitialSetup,
            canViewAnalytics: true,
            canManageSettings: isInitialSetup,
          },
          isSuperAdmin: isInitialSetup,
          createdBy: isInitialSetup ? admin._id : null,
          lastLogin: null,
          loginCount: 0,
          status: "active",
        });

        await adminRecord.save();
      } catch (adminRecordError) {
        console.error("Admin record creation error:", adminRecordError);
        // Continue with user creation even if admin record fails
      }

      // Remove password from response
      const adminResponse = admin.toObject();
      delete adminResponse.password;
      delete adminResponse.emailVerificationToken;

      res.status(201).json({
        success: true,
        message: `${
          isInitialSetup ? "سپر " : ""
        }ایڈمن اکاؤنٹ کامیابی سے بنایا گیا`,
        admin: adminResponse,
      });
    } catch (error) {
      console.error("Admin creation error:", error);
      res.status(500).json({
        success: false,
        message: "ایڈمن اکاؤنٹ بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create user by admin
   */
  static async createUserByAdmin(req, res) {
    try {
      const {
        username,
        email,
        password,
        role = "reader",
        fullName,
        bio,
        location,
        isActive = true,
        skipEmailVerification = true,
      } = req.body;

      // Check if current user is admin
      if (!req.user || !["admin", "moderator"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "صرف ایڈمن اور موڈریٹر نئے صارف بنا سکتے ہیں",
        });
      }

      // Validation
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: "نام، ای میل اور پاس ورڈ ضروری ہے",
        });
      }

      // Validate role
      const validRoles = ["reader", "poet", "moderator"];
      if (role === "admin" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "صرف ایڈمن نئے ایڈمن بنا سکتے ہیں",
        });
      }

      if (!validRoles.includes(role) && role !== "admin") {
        return res.status(400).json({
          success: false,
          message: "غلط صارف کردار",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "یہ ای میل پہلے سے رجسٹرڈ ہے",
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token if needed
      let emailVerificationToken = null;
      if (!skipEmailVerification) {
        emailVerificationToken = crypto.randomBytes(32).toString("hex");
      }

      // Create user
      const newUser = new User({
        name: fullName?.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role,
        bio: bio?.trim(),
        location: location?.trim(),
        status: isActive ? "active" : "inactive",
        isApproved: true,
        isVerified: skipEmailVerification,
        emailVerification: {
          isVerified: skipEmailVerification,
          token: skipEmailVerification ? undefined : emailVerificationToken,
        },
      });

      await newUser.save();

      // Send verification email if needed
      if (!skipEmailVerification && emailVerificationToken) {
        try {
          await AuthController.sendVerificationEmail(
            newUser.email,
            emailVerificationToken
          );
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }

      // Remove password from response
      const userResponse = newUser.toObject();
      delete userResponse.password;
      delete userResponse.emailVerificationToken;

      res.status(201).json({
        success: true,
        message: `${
          role === "admin" ? "ایڈمن" : "صارف"
        } اکاؤنٹ کامیابی سے بنایا گیا`,
        user: userResponse,
        emailVerificationSent: !skipEmailVerification,
      });
    } catch (error) {
      console.error("User creation by admin error:", error);
      res.status(500).json({
        success: false,
        message: "صارف اکاؤنٹ بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Bulk create users from CSV or array (Admin only)
   */
  static async bulkCreateUsers(req, res) {
    try {
      const {
        users,
        defaultRole = "reader",
        skipEmailVerification = true,
      } = req.body;

      // Check if current user is admin
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "صرف ایڈمن بلک یوزر بنا سکتے ہیں",
        });
      }

      if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({
          success: false,
          message: "صارفین کی فہرست ضروری ہے",
        });
      }

      const results = {
        created: [],
        failed: [],
        total: users.length,
      };

      for (const userData of users) {
        try {
          const {
            username,
            email,
            password,
            fullName,
            role = defaultRole,
          } = userData;

          // Basic validation
          if (!username || !email || !password) {
            results.failed.push({
              data: userData,
              reason: "صارف نام، ای میل اور پاس ورڈ ضروری ہے",
            });
            continue;
          }

          // Check if user already exists
          const existingUser = await User.findOne({
            $or: [
              { email: email.toLowerCase() },
              { username: username.toLowerCase() },
            ],
          });

          if (existingUser) {
            results.failed.push({
              data: userData,
              reason: "صارف پہلے سے موجود ہے",
            });
            continue;
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(password, 12);

          // Create user
          const newUser = new User({
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role,
            profile: {
              fullName: fullName?.trim(),
            },
            isEmailVerified: skipEmailVerification,
            isActive: true,
            createdBy: req.user.id,
          });

          await newUser.save();

          results.created.push({
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
          });
        } catch (userError) {
          results.failed.push({
            data: userData,
            reason: userError.message,
          });
        }
      }

      res.json({
        success: true,
        message: `${results.created.length} صارف کامیابی سے بنائے گئے`,
        results,
      });
    } catch (error) {
      console.error("Bulk user creation error:", error);
      res.status(500).json({
        success: false,
        message: "بلک یوزر بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= TOKEN VERIFICATION =============

  /**
   * Verify JWT token
   */
  static async verifyToken(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select(
        "-password -emailVerificationToken -passwordResetToken"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "اکاؤنٹ غیر فعال ہے",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({
        success: false,
        message: "ٹوکن کی تصدیق میں خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default AuthController;
