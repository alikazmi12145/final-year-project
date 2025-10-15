import express from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Contest from "../models/Contest.js";
import Review from "../models/Review.js";
import { adminAuth } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================
// ADMIN AUTHENTICATION
// ============================

/**
 * @route   POST /admin/login
 * @desc    Admin login with role verification
 * @access  Public
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find admin user
      const admin = await User.findOne({ email, role: "admin" });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials or insufficient permissions",
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if admin account is active
      if (admin.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Admin account is not active",
        });
      }

      // Generate JWT token with admin role
      const token = jwt.sign(
        {
          userId: admin._id,
          email: admin.email,
          role: admin.role,
          isAdmin: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Update last login
      admin.lastActive = new Date();
      await admin.save();

      res.json({
        success: true,
        message: "Admin login successful",
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          lastActive: admin.lastActive,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during admin login",
      });
    }
  }
);

// ============================
// ADMIN DASHBOARD OVERVIEW
// ============================

/**
 * @route   GET /admin/dashboard
 * @desc    Get admin dashboard overview with analytics
 * @access  Admin only
 */
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    // Get basic counts
    const [
      totalUsers,
      totalPoets,
      totalPoems,
      totalReviews,
      totalContests,
      pendingPoets,
      pendingPoems,
      recentUsers,
      recentPoems,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "poet" }),
      Poem.countDocuments(),
      Review.countDocuments(),
      Contest.countDocuments(),
      User.countDocuments({ role: "poet", status: "pending" }),
      Poem.countDocuments({ status: "pending" }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email role createdAt"),
      Poem.find()
        .populate("poet", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title poet createdAt"),
    ]);

    // Calculate growth metrics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [newUsersThisMonth, newPoemsThisMonth] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Poem.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    // Get most active poets (by poem count)
    const mostActivePoets = await Poem.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: "$poet", poemCount: { $sum: 1 } } },
      { $sort: { poemCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "poetInfo",
        },
      },
      { $unwind: "$poetInfo" },
      {
        $project: {
          name: "$poetInfo.name",
          email: "$poetInfo.email",
          poemCount: 1,
        },
      },
    ]);

    // Get most liked poems
    const mostLikedPoems = await Poem.find({ status: "published" })
      .populate("poet", "name")
      .sort({ "stats.favorites": -1 })
      .limit(5)
      .select("title poet stats.favorites stats.views");

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalPoets,
          totalPoems,
          totalReviews,
          totalContests,
          pendingPoets,
          pendingPoems,
          newUsersThisMonth,
          newPoemsThisMonth,
        },
        mostActivePoets,
        mostLikedPoems,
        recentActivity: {
          recentUsers,
          recentPoems,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
    });
  }
});

// ============================
// USER MANAGEMENT
// ============================

/**
 * @route   GET /admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Admin only
 */
router.get("/users", adminAuth, async (req, res) => {
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

    // Build filter object
    const filter = {};
    if (role && role !== "all") filter.role = role;
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
});

/**
 * @route   PUT /admin/users/:id/approve
 * @desc    Approve poet registration
 * @access  Admin only
 */
router.put("/users/:id/approve", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "poet") {
      return res.status(400).json({
        success: false,
        message: "Only poet registrations can be approved",
      });
    }

    user.status = approved ? "active" : "rejected";
    user.isApproved = approved;
    await user.save();

    res.json({
      success: true,
      message: `Poet registration ${
        approved ? "approved" : "rejected"
      } successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user status",
    });
  }
});

/**
 * @route   DELETE /admin/users/:id
 * @desc    Delete user account
 * @access  Admin only
 */
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting other admins
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin accounts",
      });
    }

    // Delete user and their poems
    await Promise.all([
      User.findByIdAndDelete(id),
      Poem.deleteMany({ poet: id }),
    ]);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
    });
  }
});

// ============================
// POEM MANAGEMENT
// ============================

/**
 * @route   GET /admin/poems
 * @desc    Get all poems with filtering and pagination
 * @access  Admin only
 */
router.get("/poems", adminAuth, async (req, res) => {
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

    // Build filter object
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Get poems with pagination
    const [poems, totalPoems] = await Promise.all([
      Poem.find(filter)
        .populate("poet", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .select("title content category status stats createdAt poet"),
      Poem.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalPoems / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        poems,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPoems,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get poems error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching poems",
    });
  }
});

/**
 * @route   PUT /admin/poems/:id/approve
 * @desc    Approve or reject poem submission
 * @access  Admin only
 */
router.put("/poems/:id/approve", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;

    const poem = await Poem.findById(id).populate("poet", "name email");
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    poem.status = approved ? "published" : "rejected";
    if (reason) {
      poem.adminNotes = reason;
    }
    poem.moderatedBy = req.user._id;
    poem.moderatedAt = new Date();

    await poem.save();

    res.json({
      success: true,
      message: `Poem ${approved ? "approved" : "rejected"} successfully`,
      data: poem,
    });
  } catch (error) {
    console.error("Approve poem error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating poem status",
    });
  }
});

/**
 * @route   PUT /admin/poems/:id/feature
 * @desc    Mark poem as featured
 * @access  Admin only
 */
router.put("/poems/:id/feature", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    poem.isFeatured = featured;
    if (featured) {
      poem.featuredAt = new Date();
    }
    await poem.save();

    res.json({
      success: true,
      message: `Poem ${
        featured ? "marked as featured" : "removed from featured"
      }`,
      data: poem,
    });
  } catch (error) {
    console.error("Feature poem error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating poem feature status",
    });
  }
});

/**
 * @route   DELETE /admin/poems/:id
 * @desc    Delete inappropriate poem
 * @access  Admin only
 */
router.delete("/poems/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const poem = await Poem.findByIdAndDelete(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      message: "Poem deleted successfully",
    });
  } catch (error) {
    console.error("Delete poem error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting poem",
    });
  }
});

// ============================
// CONTEST MANAGEMENT
// ============================

/**
 * @route   GET /admin/contests
 * @desc    Get all contests
 * @access  Admin only
 */
router.get("/contests", adminAuth, async (req, res) => {
  try {
    const contests = await Contest.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: contests,
    });
  } catch (error) {
    console.error("Get contests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching contests",
    });
  }
});

/**
 * @route   POST /admin/contests
 * @desc    Create new contest
 * @access  Admin only
 */
router.post(
  "/contests",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
  ],
  adminAuth,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: errors.array(),
        });
      }

      const contestData = {
        ...req.body,
        createdBy: req.user._id,
        status: "upcoming",
      };

      const contest = new Contest(contestData);
      await contest.save();

      res.status(201).json({
        success: true,
        message: "Contest created successfully",
        data: contest,
      });
    } catch (error) {
      console.error("Create contest error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating contest",
      });
    }
  }
);

/**
 * @route   PUT /admin/contests/:id
 * @desc    Update contest
 * @access  Admin only
 */
router.put("/contests/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await Contest.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    res.json({
      success: true,
      message: "Contest updated successfully",
      data: contest,
    });
  } catch (error) {
    console.error("Update contest error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating contest",
    });
  }
});

/**
 * @route   DELETE /admin/contests/:id
 * @desc    Delete contest
 * @access  Admin only
 */
router.delete("/contests/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await Contest.findByIdAndDelete(id);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found",
      });
    }

    res.json({
      success: true,
      message: "Contest deleted successfully",
    });
  } catch (error) {
    console.error("Delete contest error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting contest",
    });
  }
});

// ============================
// ANALYTICS
// ============================

/**
 * @route   GET /admin/analytics
 * @desc    Get detailed platform analytics
 * @access  Admin only
 */
router.get("/analytics", adminAuth, async (req, res) => {
  try {
    const { period = "month" } = req.query;

    // Calculate date range based on period
    let startDate;
    const endDate = new Date();

    switch (period) {
      case "week":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const [
      userGrowth,
      poemGrowth,
      topCategories,
      engagementStats,
      usersByRole,
    ] = await Promise.all([
      // User growth over time
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Poem growth over time
      Poem.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top categories
      Poem.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Engagement statistics
      Poem.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$stats.views" },
            totalFavorites: { $sum: "$stats.favorites" },
            totalShares: { $sum: "$stats.shares" },
            avgViews: { $avg: "$stats.views" },
            avgFavorites: { $avg: "$stats.favorites" },
          },
        },
      ]),

      // Users by role
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      data: {
        period,
        userGrowth,
        poemGrowth,
        topCategories,
        engagementStats: engagementStats[0] || {},
        usersByRole,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
    });
  }
});

// ============================
// AI-BASED REPORTS
// ============================

/**
 * @route   POST /admin/ai-report
 * @desc    Generate AI-based summary reports
 * @access  Admin only
 */
router.post("/ai-report", adminAuth, async (req, res) => {
  try {
    const { type = "weekly" } = req.body;

    // Get recent platform data for AI analysis
    const recentData = await getPlatformDataForAI(type);

    // Generate AI summary
    const prompt = `As an AI assistant for the Bazm-e-Sukhan Urdu Poetry Platform, provide a comprehensive ${type} activity summary based on the following data:

Platform Statistics:
- Total Users: ${recentData.totalUsers}
- New Users: ${recentData.newUsers}
- Total Poems: ${recentData.totalPoems}
- New Poems: ${recentData.newPoems}
- Active Poets: ${recentData.activePoets}

Recent Activity:
${recentData.recentActivity}

Please provide:
1. Overall platform health assessment
2. Key trends and insights
3. User engagement analysis
4. Content quality observations
5. Recommendations for improvement

Keep the summary professional, data-driven, and actionable.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiReport = completion.choices[0].message.content;

    res.json({
      success: true,
      data: {
        type,
        report: aiReport,
        generatedAt: new Date(),
        platformData: recentData,
      },
    });
  } catch (error) {
    console.error("AI report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating AI report",
    });
  }
});

// Helper function to get platform data for AI analysis
async function getPlatformDataForAI(type) {
  const days = type === "weekly" ? 7 : type === "monthly" ? 30 : 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totalUsers, newUsers, totalPoems, newPoems, activePoets, recentPoems] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Poem.countDocuments({ status: "published" }),
      Poem.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({
        role: "poet",
        lastActive: { $gte: startDate },
      }),
      Poem.find({ createdAt: { $gte: startDate } })
        .populate("poet", "name")
        .select("title poet category stats")
        .limit(10),
    ]);

  const recentActivity = recentPoems
    .map((poem) => `- "${poem.title}" by ${poem.poet?.name} (${poem.category})`)
    .join("\n");

  return {
    totalUsers,
    newUsers,
    totalPoems,
    newPoems,
    activePoets,
    recentActivity,
  };
}

export default router;
