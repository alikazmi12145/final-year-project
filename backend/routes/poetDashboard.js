import express from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Review from "../models/Review.js";
import { poetAuth } from "../middleware/auth.js";
import OpenAI from "openai";
import axios from "axios";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ============================
// POET AUTHENTICATION
// ============================

/**
 * @route   POST /poet-dashboard/login
 * @desc    Poet login with role verification
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

      // Find poet user
      const poet = await User.findOne({ email, role: "poet" });
      if (!poet) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials or insufficient permissions",
        });
      }

      // Check password
      const bcrypt = await import("bcryptjs");
      const isPasswordValid = await bcrypt.compare(password, poet.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if poet account is approved
      if (poet.status !== "active" || !poet.isApproved) {
        return res.status(403).json({
          success: false,
          message: "Poet account is not approved yet",
        });
      }

      // Generate JWT token
      const jwt = await import("jsonwebtoken");
      const token = jwt.sign(
        {
          userId: poet._id,
          email: poet.email,
          role: poet.role,
          isPoet: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Update last login
      poet.lastActive = new Date();
      await poet.save();

      res.json({
        success: true,
        message: "Poet login successful",
        token,
        poet: {
          id: poet._id,
          name: poet.name,
          email: poet.email,
          role: poet.role,
          profile: poet.profile,
          lastActive: poet.lastActive,
        },
      });
    } catch (error) {
      console.error("Poet login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during poet login",
      });
    }
  }
);

// ============================
// POET DASHBOARD OVERVIEW
// ============================

/**
 * @route   GET /poet-dashboard/overview
 * @desc    Get poet dashboard overview with statistics
 * @access  Poet only
 */
router.get("/overview", poetAuth, async (req, res) => {
  try {
    const poetId = req.user._id;

    // Get poet's statistics
    const [
      totalPoems,
      publishedPoems,
      pendingPoems,
      rejectedPoems,
      totalViews,
      totalFavorites,
      recentPoems,
      topPoems,
    ] = await Promise.all([
      Poem.countDocuments({ poet: poetId }),
      Poem.countDocuments({ poet: poetId, status: "published" }),
      Poem.countDocuments({ poet: poetId, status: "pending" }),
      Poem.countDocuments({ poet: poetId, status: "rejected" }),
      Poem.aggregate([
        { $match: { poet: poetId } },
        { $group: { _id: null, total: { $sum: "$stats.views" } } },
      ]),
      Poem.aggregate([
        { $match: { poet: poetId } },
        { $group: { _id: null, total: { $sum: "$stats.favorites" } } },
      ]),
      Poem.find({ poet: poetId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title status createdAt stats"),
      Poem.find({ poet: poetId, status: "published" })
        .sort({ "stats.views": -1 })
        .limit(5)
        .select("title stats"),
    ]);

    // Calculate engagement rate
    const views = totalViews[0]?.total || 0;
    const favorites = totalFavorites[0]?.total || 0;
    const engagementRate =
      views > 0 ? ((favorites / views) * 100).toFixed(2) : 0;

    // Get monthly growth (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [newPoemsThisMonth, newViewsThisMonth] = await Promise.all([
      Poem.countDocuments({ poet: poetId, createdAt: { $gte: thirtyDaysAgo } }),
      Poem.aggregate([
        {
          $match: {
            poet: poetId,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: "$stats.views" } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalPoems,
          publishedPoems,
          pendingPoems,
          rejectedPoems,
          totalViews: views,
          totalFavorites: favorites,
          engagementRate: parseFloat(engagementRate),
          newPoemsThisMonth,
          newViewsThisMonth: newViewsThisMonth[0]?.total || 0,
        },
        recentPoems,
        topPoems,
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard overview",
    });
  }
});

// ============================
// POET PROFILE MANAGEMENT
// ============================

/**
 * @route   GET /poet-dashboard/profile
 * @desc    Get poet profile details
 * @access  Poet only
 */
router.get("/profile", poetAuth, async (req, res) => {
  try {
    const poet = await User.findById(req.user._id).select("-password");

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet profile not found",
      });
    }

    res.json({
      success: true,
      data: poet,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
});

/**
 * @route   PUT /poet-dashboard/profile
 * @desc    Update poet profile
 * @access  Poet only
 */
router.put(
  "/profile",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("profile.bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio must be less than 500 characters"),
    body("profile.location").optional().trim(),
    body("profile.website")
      .optional()
      .isURL()
      .withMessage("Must be a valid URL"),
  ],
  poetAuth,
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

      const updateData = {};
      const { name, profile } = req.body;

      if (name) updateData.name = name;
      if (profile) {
        updateData.profile = {
          ...req.user.profile,
          ...profile,
        };
      }

      const updatedPoet = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      ).select("-password");

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedPoet,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
      });
    }
  }
);

/**
 * @route   POST /poet-dashboard/profile/avatar
 * @desc    Upload poet profile avatar
 * @access  Poet only
 */
router.post(
  "/profile/avatar",
  poetAuth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "poet-avatars",
              public_id: `poet_${req.user._id}`,
              overwrite: true,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file.buffer);
      });

      // Update user profile with new avatar URL
      const updatedPoet = await User.findByIdAndUpdate(
        req.user._id,
        {
          "profile.avatar": result.secure_url,
          "profile.avatarPublicId": result.public_id,
        },
        { new: true }
      ).select("-password");

      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        data: {
          avatar: result.secure_url,
          poet: updatedPoet,
        },
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading avatar",
      });
    }
  }
);

// ============================
// POEM MANAGEMENT
// ============================

/**
 * @route   GET /poet-dashboard/poems
 * @desc    Get poet's poems with filtering and pagination
 * @access  Poet only
 */
router.get("/poems", poetAuth, async (req, res) => {
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

    // Build filter object for poet's poems only
    const filter = { poet: req.user._id };
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
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .select("title content category status stats createdAt translations"),
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
 * @route   POST /poet-dashboard/poems
 * @desc    Create new poem
 * @access  Poet only
 */
router.post(
  "/poems",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("content").trim().notEmpty().withMessage("Content is required"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("language")
      .optional()
      .isIn(["urdu", "english"])
      .withMessage("Language must be urdu or english"),
  ],
  poetAuth,
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

      const poemData = {
        ...req.body,
        poet: req.user._id,
        status: "pending", // New poems need approval
        stats: {
          views: 0,
          favorites: 0,
          shares: 0,
        },
      };

      const poem = new Poem(poemData);
      await poem.save();

      res.status(201).json({
        success: true,
        message: "Poem submitted for review",
        data: poem,
      });
    } catch (error) {
      console.error("Create poem error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating poem",
      });
    }
  }
);

/**
 * @route   PUT /poet-dashboard/poems/:id
 * @desc    Update existing poem
 * @access  Poet only
 */
router.put(
  "/poems/:id",
  [
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Title cannot be empty"),
    body("content")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Content cannot be empty"),
    body("category")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Category cannot be empty"),
  ],
  poetAuth,
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

      const { id } = req.params;

      // Check if poem belongs to the poet
      const poem = await Poem.findOne({ _id: id, poet: req.user._id });
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "Poem not found or unauthorized",
        });
      }

      // Don't allow editing published poems without changing status
      if (poem.status === "published") {
        req.body.status = "pending"; // Re-submit for review
      }

      const updatedPoem = await Poem.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Poem updated successfully",
        data: updatedPoem,
      });
    } catch (error) {
      console.error("Update poem error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating poem",
      });
    }
  }
);

/**
 * @route   DELETE /poet-dashboard/poems/:id
 * @desc    Delete poem
 * @access  Poet only
 */
router.delete("/poems/:id", poetAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if poem belongs to the poet
    const poem = await Poem.findOne({ _id: id, poet: req.user._id });
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found or unauthorized",
      });
    }

    await Poem.findByIdAndDelete(id);

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
// AI ASSISTANCE
// ============================

/**
 * @route   POST /poet-dashboard/ai/suggestions
 * @desc    Get AI suggestions for poetry improvement
 * @access  Poet only
 */
router.post(
  "/ai/suggestions",
  [
    body("content").trim().notEmpty().withMessage("Poem content is required"),
    body("language")
      .optional()
      .isIn(["urdu", "english"])
      .withMessage("Language must be urdu or english"),
  ],
  poetAuth,
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

      const { content, language = "urdu" } = req.body;

      const prompt = `As an expert Urdu poetry critic and mentor, please analyze the following ${language} poem and provide constructive feedback:

Poem:
${content}

Please provide:
1. Overall impression and strengths
2. Areas for improvement (meter, rhyme, imagery, meaning)
3. Specific suggestions for better word choices
4. Cultural and literary context if relevant
5. Encouragement and positive reinforcement

Keep the feedback constructive, educational, and encouraging for the poet.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      });

      const suggestions = completion.choices[0].message.content;

      res.json({
        success: true,
        data: {
          suggestions,
          language,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("AI suggestions error:", error);
      res.status(500).json({
        success: false,
        message: "Error generating AI suggestions",
      });
    }
  }
);

/**
 * @route   POST /poet-dashboard/ai/translate
 * @desc    Get AI translation of poem
 * @access  Poet only
 */
router.post(
  "/ai/translate",
  [
    body("content").trim().notEmpty().withMessage("Poem content is required"),
    body("fromLanguage")
      .isIn(["urdu", "english"])
      .withMessage("From language must be urdu or english"),
    body("toLanguage")
      .isIn(["urdu", "english"])
      .withMessage("To language must be urdu or english"),
  ],
  poetAuth,
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

      const { content, fromLanguage, toLanguage } = req.body;

      if (fromLanguage === toLanguage) {
        return res.status(400).json({
          success: false,
          message: "Source and target languages cannot be the same",
        });
      }

      const prompt = `Translate the following ${fromLanguage} poem to ${toLanguage}. Maintain the poetic essence, rhythm, and emotional depth while making it culturally appropriate:

Original Poem (${fromLanguage}):
${content}

Please provide a thoughtful translation that preserves the artistic and emotional qualities of the original.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.8,
      });

      const translation = completion.choices[0].message.content;

      res.json({
        success: true,
        data: {
          original: content,
          translation,
          fromLanguage,
          toLanguage,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("AI translation error:", error);
      res.status(500).json({
        success: false,
        message: "Error generating translation",
      });
    }
  }
);

// ============================
// CLASSICAL POETRY SEARCH
// ============================

/**
 * @route   POST /poet-dashboard/classical-search
 * @desc    Search classical poetry for inspiration
 * @access  Poet only
 */
router.post(
  "/classical-search",
  [
    body("query").trim().notEmpty().withMessage("Search query is required"),
    body("poet").optional().trim(),
  ],
  poetAuth,
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

      const { query, poet } = req.body;

      // Search Rekhta API for classical poetry
      const rekhtaApiUrl = "https://rekhta.org/api/poems/search";
      const searchParams = {
        q: query,
        ...(poet && { poet }),
        limit: 10,
      };

      const response = await axios.get(rekhtaApiUrl, {
        params: searchParams,
        headers: {
          "User-Agent": "Bazm-e-Sukhan Platform",
        },
      });

      res.json({
        success: true,
        data: {
          query,
          results: response.data,
          source: "Rekhta",
        },
      });
    } catch (error) {
      console.error("Classical search error:", error);

      // Fallback response if API fails
      res.json({
        success: true,
        data: {
          query: req.body.query,
          results: [],
          source: "Rekhta (Service temporarily unavailable)",
        },
      });
    }
  }
);

// ============================
// ANALYTICS
// ============================

/**
 * @route   GET /poet-dashboard/analytics
 * @desc    Get poet's detailed analytics
 * @access  Poet only
 */
router.get("/analytics", poetAuth, async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const poetId = req.user._id;

    // Calculate date range
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

    // Get detailed analytics
    const [
      poemGrowth,
      viewsOverTime,
      favoritesOverTime,
      topPerformingPoems,
      categoryDistribution,
    ] = await Promise.all([
      // Poem creation over time
      Poem.aggregate([
        { $match: { poet: poetId, createdAt: { $gte: startDate } } },
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

      // Views over time
      Poem.aggregate([
        { $match: { poet: poetId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            views: { $sum: "$stats.views" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Favorites over time
      Poem.aggregate([
        { $match: { poet: poetId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            favorites: { $sum: "$stats.favorites" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top performing poems
      Poem.find({ poet: poetId, status: "published" })
        .sort({ "stats.views": -1 })
        .limit(10)
        .select("title stats category createdAt"),

      // Category distribution
      Poem.aggregate([
        { $match: { poet: poetId, status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period,
        poemGrowth,
        viewsOverTime,
        favoritesOverTime,
        topPerformingPoems,
        categoryDistribution,
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

export default router;
