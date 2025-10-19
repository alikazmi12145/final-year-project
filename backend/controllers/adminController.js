import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Contest from "../models/Contest.js";
import News from "../models/News.js";
import SupportTicket from "../models/SupportTicket.js";
import Review from "../models/Review.js";
import Collection from "../models/Collection.js";
import LearningResource from "../models/LearningResource.js";
import mongoose from "mongoose";

/**
 * Admin Controller for Bazm-E-Sukhan Platform
 * Handles all administrative operations including user management, content moderation, and analytics
 */

class AdminController {
  // ============= USER MANAGEMENT =============

  /**
   * Get all users with pagination and filtering
   */
  static async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = {};

      if (role && role !== "all") {
        query.role = role;
      }

      if (status && status !== "all") {
        query.isActive = status === "active";
      }

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { "profile.fullName": { $regex: search, $options: "i" } },
        ];
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const users = await User.find(query)
        .select("-password")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalUsers = await User.countDocuments(query);

      res.json({
        success: true,
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNext: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        message: "صارفین حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user details by ID
   */
  static async getUserById(req, res) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const user = await User.findById(userId).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Get user statistics
      const [poemCount, reviewCount, collectionCount] = await Promise.all([
        Poem.countDocuments({ author: userId }),
        Review.countDocuments({ user: userId }),
        Collection.countDocuments({ user: userId }),
      ]);

      const userStats = {
        totalPoems: poemCount,
        totalReviews: reviewCount,
        totalCollections: collectionCount,
      };

      res.json({
        success: true,
        user,
        statistics: userStats,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی تفصیلات حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new user (Admin only)
   */
  static async createUser(req, res) {
    try {
      const {
        username,
        email,
        password,
        role = "reader",
        profile = {},
        isActive = true,
        sendWelcomeEmail = true,
      } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "صارف نام، ای میل اور پاس ورڈ ضروری ہے",
        });
      }

      // Validate role
      const validRoles = ["reader", "poet", "moderator", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف کردار",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            existingUser.email === email.toLowerCase()
              ? "یہ ای میل پہلے سے رجسٹرڈ ہے"
              : "یہ صارف نام پہلے سے موجود ہے",
        });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = new User({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role,
        profile: {
          fullName: profile.fullName?.trim(),
          bio: profile.bio?.trim(),
          location: profile.location?.trim(),
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          interests: profile.interests || [],
          socialLinks: profile.socialLinks || {},
        },
        isEmailVerified: true, // Admin-created users are auto-verified
        isActive,
        createdBy: req.user.id,
      });

      await newUser.save();

      // Send welcome email if requested
      if (sendWelcomeEmail) {
        try {
          await AdminController.sendWelcomeEmail(newUser.email, {
            username: newUser.username,
            fullName: newUser.profile.fullName,
            tempPassword: password,
          });
        } catch (emailError) {
          console.error("Welcome email failed:", emailError);
        }
      }

      // Remove password from response
      const userResponse = newUser.toObject();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: "صارف کامیابی سے بنایا گیا",
        user: userResponse,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        success: false,
        message: "صارف بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update user role or status
   */
  static async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { role, isActive, profile } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Update fields
      if (role !== undefined) {
        user.role = role;
      }

      if (isActive !== undefined) {
        user.isActive = isActive;
      }

      if (profile) {
        user.profile = { ...user.profile, ...profile };
      }

      await user.save();

      res.json({
        success: true,
        message: "صارف کی معلومات اپ ڈیٹ ہوئیں",
        user: user.toObject({
          transform: (doc, ret) => {
            delete ret.password;
            return ret;
          },
        }),
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی معلومات اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const { deleteContent = false } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Prevent deletion of admin accounts
      if (user.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "ایڈمن اکاؤنٹ ڈیلیٹ نہیں کیا جا سکتا",
        });
      }

      if (deleteContent) {
        // Delete all user content
        await Promise.all([
          Poem.deleteMany({ author: userId }),
          Review.deleteMany({ user: userId }),
          Collection.deleteMany({ user: userId }),
        ]);
      } else {
        // Just mark poems as orphaned or transfer to system account
        await Poem.updateMany(
          { author: userId },
          { author: null, status: "archived" }
        );
      }

      await User.findByIdAndDelete(userId);

      res.json({
        success: true,
        message: "صارف کا اکاؤنٹ ڈیلیٹ ہو گیا",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "صارف کا اکاؤنٹ ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= USER APPROVAL SYSTEM =============

  /**
   * Get all pending users awaiting approval
   */
  static async getPendingUsers(req, res) {
    try {
      const { page = 1, limit = 20, role } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query for pending users
      let query = {
        status: "pending",
        isApproved: false,
        $or: [{ role: "poet" }, { role: "moderator" }],
      };

      if (role && (role === "poet" || role === "moderator")) {
        query = {
          status: "pending",
          isApproved: false,
          role: role,
        };
      }

      const users = await User.find(query)
        .select("-password -emailVerificationToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const totalUsers = await User.countDocuments(query);
      const totalPages = Math.ceil(totalUsers / limitNum);

      res.json({
        success: true,
        users: users,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalUsers: totalUsers,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({
        success: false,
        message: "منتظر صارفین کی فہرست لاتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Approve a pending user
   */
  static async approveUser(req, res) {
    try {
      const { userId } = req.params;
      const { approved, reason } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "صارف کی شناخت ضروری ہے",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف نہیں ملا",
        });
      }

      if (user.role !== "poet" && user.role !== "moderator") {
        return res.status(400).json({
          success: false,
          message: "یہ صرف شاعروں اور موڈریٹرز کے لیے ہے",
        });
      }

      if (approved) {
        // Approve the user
        user.isApproved = true;
        user.status = "active";
        user.approvedAt = new Date();
        user.approvedBy = req.user.userId || req.user.id;

        await user.save();

        // TODO: Send approval notification email

        res.json({
          success: true,
          message:
            user.role === "poet"
              ? "شاعر کا اکاؤنٹ منظور کر دیا گیا"
              : "موڈریٹر کا اکاؤنٹ منظور کر دیا گیا",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            isApproved: user.isApproved,
            approvedAt: user.approvedAt,
          },
        });
      } else {
        // Reject the user
        user.status = "rejected";
        user.rejectedAt = new Date();
        user.rejectedBy = req.user.userId || req.user.id;
        user.rejectionReason = reason || "ایڈمن کی جانب سے مسترد";

        await user.save();

        // TODO: Send rejection notification email

        res.json({
          success: true,
          message:
            user.role === "poet"
              ? "شاعر کا اکاؤنٹ مسترد کر دیا گیا"
              : "موڈریٹر کا اکاؤنٹ مسترد کر دیا گیا",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            isApproved: user.isApproved,
            rejectedAt: user.rejectedAt,
            rejectionReason: user.rejectionReason,
          },
        });
      }
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی منظوری دیتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Bulk approve multiple users
   */
  static async bulkApproveUsers(req, res) {
    try {
      const { userIds, action } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "صارفین کی فہرست ضروری ہے",
        });
      }

      if (!action || (action !== "approve" && action !== "reject")) {
        return res.status(400).json({
          success: false,
          message: "صحیح عمل منتخب کریں",
        });
      }

      const updateQuery =
        action === "approve"
          ? {
              isApproved: true,
              status: "active",
              approvedAt: new Date(),
              approvedBy: req.user.userId || req.user.id,
            }
          : {
              status: "rejected",
              rejectedAt: new Date(),
              rejectedBy: req.user.userId || req.user.id,
              rejectionReason: "بلک ایکشن کے ذریعے مسترد",
            };

      const result = await User.updateMany(
        {
          _id: { $in: userIds },
          $or: [{ role: "poet" }, { role: "moderator" }],
          status: "pending",
        },
        updateQuery
      );

      res.json({
        success: true,
        message:
          action === "approve"
            ? `${result.modifiedCount} صارفین کو منظوری دے دی گئی`
            : `${result.modifiedCount} صارفین کو مسترد کر دیا گیا`,
        affectedUsers: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error bulk approving users:", error);
      res.status(500).json({
        success: false,
        message: "بلک ایکشن کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= CONTENT MODERATION =============

  /**
   * Get all poems for moderation
   */
  static async getAllPoems(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {};

      if (status && status !== "all") {
        query.status = status;
      }

      if (category && category !== "all") {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ];
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const poems = await Poem.find(query)
        .populate("author", "username profile.fullName")
        .populate("poet", "name")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const totalPoems = await Poem.countDocuments(query);

      res.json({
        success: true,
        poems,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalPoems / limitNum),
          totalPoems,
          hasNext: pageNum < Math.ceil(totalPoems / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching poems:", error);
      res.status(500).json({
        success: false,
        message: "شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Approve or reject poem
   */
  static async moderatePoem(req, res) {
    try {
      const { poemId } = req.params;
      const { action, reason } = req.body; // action: 'approve', 'reject', 'archive'

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      const poem = await Poem.findById(poemId);

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      let newStatus;
      let message;

      switch (action) {
        case "approve":
          newStatus = "published";
          message = "شاعری منظور ہو گئی";
          poem.publishedAt = new Date();
          break;
        case "reject":
          newStatus = "rejected";
          message = "شاعری مسترد کر دی گئی";
          poem.rejectionReason = reason;
          break;
        case "archive":
          newStatus = "archived";
          message = "شاعری آرکائیو کر دی گئی";
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "غلط ایکشن",
          });
      }

      poem.status = newStatus;
      poem.moderatedBy = req.user.id;
      poem.moderatedAt = new Date();

      await poem.save();

      res.json({
        success: true,
        message,
        poem,
      });
    } catch (error) {
      console.error("Error moderating poem:", error);
      res.status(500).json({
        success: false,
        message: "شاعری کی تصدیق کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get all reviews for moderation
   */
  static async getAllReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {};

      if (status && status !== "all") {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ];
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const reviews = await Review.find(query)
        .populate("user", "username profile.fullName")
        .populate("poem", "title")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const totalReviews = await Review.countDocuments(query);

      res.json({
        success: true,
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalReviews / limitNum),
          totalReviews,
          hasNext: pageNum < Math.ceil(totalReviews / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({
        success: false,
        message: "جائزے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Moderate review
   */
  static async moderateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { action, reason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: "غلط جائزہ ID",
        });
      }

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "جائزہ موجود نہیں",
        });
      }

      let newStatus;
      let message;

      switch (action) {
        case "approve":
          newStatus = "active";
          message = "جائزہ منظور ہو گیا";
          break;
        case "reject":
          newStatus = "rejected";
          message = "جائزہ مسترد کر دیا گیا";
          review.rejectionReason = reason;
          break;
        case "hide":
          newStatus = "hidden";
          message = "جائزہ چھپا دیا گیا";
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "غلط ایکشن",
          });
      }

      review.status = newStatus;
      review.moderatedBy = req.user.id;
      review.moderatedAt = new Date();

      await review.save();

      res.json({
        success: true,
        message,
        review,
      });
    } catch (error) {
      console.error("Error moderating review:", error);
      res.status(500).json({
        success: false,
        message: "جائزے کی تصدیق کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= SUPPORT TICKETS =============

  /**
   * Get all support tickets
   */
  static async getAllSupportTickets(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        category,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {};

      if (status && status !== "all") {
        query.status = status;
      }

      if (priority && priority !== "all") {
        query.priority = priority;
      }

      if (category && category !== "all") {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { ticketId: { $regex: search, $options: "i" } },
          { subject: { $regex: search, $options: "i" } },
          { message: { $regex: search, $options: "i" } },
        ];
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const tickets = await SupportTicket.find(query)
        .populate("user", "username email profile.fullName")
        .populate("assignedTo", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const totalTickets = await SupportTicket.countDocuments(query);

      res.json({
        success: true,
        tickets,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalTickets / limitNum),
          totalTickets,
          hasNext: pageNum < Math.ceil(totalTickets / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({
        success: false,
        message: "سپورٹ ٹکٹس حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update support ticket
   */
  static async updateSupportTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { status, priority, assignedTo, adminResponse } = req.body;

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "غلط ٹکٹ ID",
        });
      }

      const ticket = await SupportTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "ٹکٹ موجود نہیں",
        });
      }

      // Update fields
      if (status) {
        ticket.status = status;
        ticket.timeline.push({
          action: `Status changed to ${status}`,
          actionBy: req.user.id,
          timestamp: new Date(),
        });
      }

      if (priority) {
        ticket.priority = priority;
        ticket.timeline.push({
          action: `Priority changed to ${priority}`,
          actionBy: req.user.id,
          timestamp: new Date(),
        });
      }

      if (assignedTo) {
        ticket.assignedTo = assignedTo;
        ticket.timeline.push({
          action: `Ticket assigned`,
          actionBy: req.user.id,
          timestamp: new Date(),
        });
      }

      if (adminResponse) {
        ticket.adminResponse = adminResponse;
        ticket.respondedAt = new Date();
        ticket.timeline.push({
          action: "Admin response added",
          actionBy: req.user.id,
          timestamp: new Date(),
        });
      }

      await ticket.save();

      await ticket.populate([
        { path: "user", select: "username email profile.fullName" },
        { path: "assignedTo", select: "username profile.fullName" },
      ]);

      res.json({
        success: true,
        message: "ٹکٹ اپ ڈیٹ ہو گیا",
        ticket,
      });
    } catch (error) {
      console.error("Error updating support ticket:", error);
      res.status(500).json({
        success: false,
        message: "ٹکٹ اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= ANALYTICS & DASHBOARD =============

  /**
   * Get admin dashboard statistics
   */
  static async getDashboardStats(req, res) {
    try {
      const { timeframe = "7d" } = req.query;

      let startDate = new Date();
      switch (timeframe) {
        case "24h":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get overall statistics
      const [
        totalUsers,
        totalPoems,
        totalReviews,
        totalTickets,
        newUsers,
        newPoems,
        newReviews,
        newTickets,
        pendingPoems,
        openTickets,
      ] = await Promise.all([
        User.countDocuments(),
        Poem.countDocuments(),
        Review.countDocuments(),
        SupportTicket.countDocuments(),
        User.countDocuments({ createdAt: { $gte: startDate } }),
        Poem.countDocuments({ createdAt: { $gte: startDate } }),
        Review.countDocuments({ createdAt: { $gte: startDate } }),
        SupportTicket.countDocuments({ createdAt: { $gte: startDate } }),
        Poem.countDocuments({ status: "pending" }),
        SupportTicket.countDocuments({ status: "open" }),
      ]);

      // Get user role distribution
      const userRoleStats = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]);

      // Get poem category distribution
      const poemCategoryStats = await Poem.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]);

      // Get recent activity
      const recentActivity = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select("username profile.fullName createdAt"),
        Poem.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("author", "username")
          .select("title author createdAt"),
        Review.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "username")
          .select("title user createdAt"),
      ]);

      const dashboardStats = {
        overview: {
          totalUsers,
          totalPoems,
          totalReviews,
          totalTickets,
          newUsers,
          newPoems,
          newReviews,
          newTickets,
          pendingPoems,
          openTickets,
        },
        distributions: {
          userRoles: userRoleStats,
          poemCategories: poemCategoryStats,
        },
        recentActivity: {
          users: recentActivity[0],
          poems: recentActivity[1],
          reviews: recentActivity[2],
        },
        timeframe,
      };

      res.json({
        success: true,
        stats: dashboardStats,
        generatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "ڈیش بورڈ کے اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get detailed analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { type = "users", period = "monthly" } = req.query;

      let groupBy;
      switch (period) {
        case "daily":
          groupBy = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          };
          break;
        case "weekly":
          groupBy = {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
          };
          break;
        case "monthly":
        default:
          groupBy = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          };
      }

      let Model;
      switch (type) {
        case "poems":
          Model = Poem;
          break;
        case "reviews":
          Model = Review;
          break;
        case "tickets":
          Model = SupportTicket;
          break;
        case "users":
        default:
          Model = User;
      }

      const analytics = await Model.aggregate([
        {
          $group: {
            _id: groupBy,
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);

      res.json({
        success: true,
        analytics,
        type,
        period,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({
        success: false,
        message: "تجزیات حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= NEWS & ANNOUNCEMENTS =============

  /**
   * Create news/announcement
   */
  static async createNews(req, res) {
    try {
      const {
        title,
        content,
        type = "news",
        category,
        priority = "normal",
        publishAt,
        tags,
      } = req.body;

      const news = new News({
        title: title.trim(),
        content: content.trim(),
        type,
        category,
        priority,
        author: req.user.id,
        publishAt: publishAt ? new Date(publishAt) : new Date(),
        tags: tags || [],
      });

      await news.save();
      await news.populate("author", "username profile.fullName");

      res.status(201).json({
        success: true,
        message: "خبر کامیابی سے بنائی گئی",
        news,
      });
    } catch (error) {
      console.error("Error creating news:", error);
      res.status(500).json({
        success: false,
        message: "خبر بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get all news for admin
   */
  static async getAllNews(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {};

      if (type && type !== "all") {
        query.type = type;
      }

      if (status && status !== "all") {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ];
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const news = await News.find(query)
        .populate("author", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const totalNews = await News.countDocuments(query);

      res.json({
        success: true,
        news,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalNews / limitNum),
          totalNews,
          hasNext: pageNum < Math.ceil(totalNews / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({
        success: false,
        message: "خبریں حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update news
   */
  static async updateNews(req, res) {
    try {
      const { newsId } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(newsId)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const news = await News.findByIdAndUpdate(
        newsId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate("author", "username profile.fullName");

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      res.json({
        success: true,
        message: "خبر اپ ڈیٹ ہو گئی",
        news,
      });
    } catch (error) {
      console.error("Error updating news:", error);
      res.status(500).json({
        success: false,
        message: "خبر اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete news
   */
  static async deleteNews(req, res) {
    try {
      const { newsId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(newsId)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const news = await News.findByIdAndDelete(newsId);

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      res.json({
        success: true,
        message: "خبر ڈیلیٹ ہو گئی",
      });
    } catch (error) {
      console.error("Error deleting news:", error);
      res.status(500).json({
        success: false,
        message: "خبر ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= EMAIL UTILITIES =============

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(email, userData) {
    try {
      const nodemailer = await import("nodemailer");

      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const { username, fullName, tempPassword } = userData;

      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "بذم سخن میں خوش آمدید",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">بذم سخن میں خوش آمدید</h2>
            <p>عزیز ${fullName || username}،</p>
            <p>آپ کا اکاؤنٹ کامیابی سے بن گیا ہے۔ یہاں آپ کی لاگ ان کی تفصیلات ہیں:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>صارف نام:</strong> ${username}</p>
              <p><strong>ای میل:</strong> ${email}</p>
              <p><strong>عارضی پاس ورڈ:</strong> ${tempPassword}</p>
            </div>
            
            <p style="color: #e74c3c;"><strong>نوٹ:</strong> براہ کرم پہلی بار لاگ ان کرنے کے بعد اپنا پاس ورڈ تبدیل کریں۔</p>
            
            <a href="${
              process.env.FRONTEND_URL
            }/login" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">لاگ ان کریں</a>
            
            <p style="margin-top: 30px;">بذم سخن ٹیم</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Welcome email error:", error);
      throw error;
    }
  }
}

export default AdminController;
