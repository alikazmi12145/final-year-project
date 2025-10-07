import express from "express";
import { body, validationResult } from "express-validator";
import Poet from "../models/poet.js";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import { auth, poetAuth, adminAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting
const poetOperationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Get all poets (public)
router.get("/", poetOperationLimit, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      era,
      isAlive,
      country,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {
      status: "active",
      // Removed isVerified requirement so all active poets show up
    };

    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
        {
          achievements: {
            $elemMatch: { title: { $regex: search, $options: "i" } },
          },
        },
      ];
    }

    if (era && era !== "all") {
      query.era = era;
    }

    if (isAlive !== undefined) {
      query.isAlive = isAlive === "true";
    }

    if (country) {
      query.birthPlace = { $regex: country, $options: "i" };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const poets = await Poet.find(query)
      .populate("user", "name email isVerified verificationBadge")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Poet.countDocuments(query);

    // Add poem counts for each poet
    const poetsWithStats = await Promise.all(
      poets.map(async (poet) => {
        const poemCount = await Poem.countDocuments({
          poet: poet._id,
          published: true,
          status: "approved",
        });

        const totalLikes = await Poem.aggregate([
          { $match: { poet: poet._id, published: true, status: "approved" } },
          { $group: { _id: null, totalLikes: { $sum: "$likesCount" } } },
        ]);

        return {
          ...poet,
          stats: {
            poemCount,
            totalLikes: totalLikes[0]?.totalLikes || 0,
            followers: poet.followers?.length || 0,
          },
        };
      })
    );

    res.json({
      success: true,
      poets: poetsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        eras: await Poet.distinct("era"),
        countries: await Poet.distinct("birthPlace"),
      },
    });
  } catch (error) {
    console.error("Get poets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poets",
    });
  }
});

// Get featured poets
router.get("/featured", poetOperationLimit, async (req, res) => {
  try {
    const featuredPoets = await Poet.find({
      status: "active",
      isVerified: true,
      featured: true,
    })
      .populate("user", "name isVerified")
      .sort({ featuredAt: -1 })
      .limit(12)
      .lean();

    // Add stats for each poet
    const poetsWithStats = await Promise.all(
      featuredPoets.map(async (poet) => {
        const poemCount = await Poem.countDocuments({
          poet: poet._id,
          published: true,
          status: "approved",
        });

        return {
          ...poet,
          stats: { poemCount },
        };
      })
    );

    res.json({
      success: true,
      poets: poetsWithStats,
    });
  } catch (error) {
    console.error("Get featured poets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured poets",
    });
  }
});

// Get poet by ID (public)
router.get("/:id", poetOperationLimit, async (req, res) => {
  try {
    const poet = await Poet.findById(req.params.id)
      .populate("user", "name email isVerified verificationBadge")
      .populate("verifiedBy", "name")
      .lean();

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found",
      });
    }

    // Check if poet is public or user has permission
    if (poet.status !== "active" && (!req.user || req.user.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "This poet profile is not public",
      });
    }

    // Get poet's poems
    const poems = await Poem.find({
      poet: poet._id,
      published: true,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get poet statistics
    const stats = await Poem.aggregate([
      { $match: { poet: poet._id, published: true, status: "approved" } },
      {
        $group: {
          _id: null,
          totalPoems: { $sum: 1 },
          totalLikes: { $sum: "$likesCount" },
          totalViews: { $sum: "$viewsCount" },
          totalComments: { $sum: "$commentsCount" },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const poetStats = stats[0] || {
      totalPoems: 0,
      totalLikes: 0,
      totalViews: 0,
      totalComments: 0,
      averageRating: 0,
    };

    // Get poem categories distribution
    const categoryDistribution = await Poem.aggregate([
      { $match: { poet: poet._id, published: true, status: "approved" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      poet,
      poems,
      stats: poetStats,
      categoryDistribution,
      isFollowing: req.user ? poet.followers?.includes(req.user.userId) : false,
    });
  } catch (error) {
    console.error("Get poet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poet",
    });
  }
});

// Get current user's poet profile
router.get("/profile/:userId", auth, async (req, res) => {
  try {
    // Check if requesting own profile or admin
    if (req.params.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const poet = await Poet.findOne({ user: req.params.userId })
      .populate("user", "name email isVerified")
      .lean();

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet profile not found",
      });
    }

    res.json({
      success: true,
      poet,
    });
  } catch (error) {
    console.error("Get poet profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poet profile",
    });
  }
});

// Update poet profile
router.put(
  "/profile",
  auth,
  [
    body("name").optional().isLength({ min: 2, max: 100 }).trim(),
    body("bio").optional().isLength({ max: 1000 }).trim(),
    body("location").optional().isLength({ max: 100 }).trim(),
    body("website").optional().isURL(),
    body("socialLinks.twitter").optional().isURL(),
    body("socialLinks.facebook").optional().isURL(),
    body("socialLinks.instagram").optional().isURL(),
    body("birthPlace").optional().isLength({ max: 100 }).trim(),
    body("deathPlace").optional().isLength({ max: 100 }).trim(),
    body("era").optional().isIn(["classical", "modern", "contemporary"]),
    body("languages").optional().isArray({ max: 10 }),
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

      // Find or create poet profile
      let poet = await Poet.findOne({ user: req.user.userId });

      if (!poet) {
        // Create new poet profile
        poet = new Poet({
          user: req.user.userId,
          name: req.body.name || req.user.name,
          ...req.body,
          status: "pending",
        });
      } else {
        // Update existing profile
        Object.assign(poet, req.body);
        poet.updatedAt = new Date();
      }

      await poet.save();

      // Populate for response
      await poet.populate("user", "name email isVerified");

      res.json({
        success: true,
        message: "Poet profile updated successfully",
        poet,
      });
    } catch (error) {
      console.error("Update poet profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update poet profile",
      });
    }
  }
);

// Follow/Unfollow poet
router.post("/:id/follow", auth, poetOperationLimit, async (req, res) => {
  try {
    const poet = await Poet.findById(req.params.id);

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found",
      });
    }

    if (poet.user.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself",
      });
    }

    const userId = req.user.userId;
    const isFollowing = poet.followers.includes(userId);

    if (isFollowing) {
      // Unfollow
      poet.followers.pull(userId);
      poet.followersCount = Math.max(0, poet.followersCount - 1);
    } else {
      // Follow
      poet.followers.push(userId);
      poet.followersCount += 1;
    }

    await poet.save();

    res.json({
      success: true,
      following: !isFollowing,
      followersCount: poet.followersCount,
    });
  } catch (error) {
    console.error("Follow poet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process follow request",
    });
  }
});

// Add achievement to poet
router.post(
  "/:id/achievements",
  adminAuth,
  [
    body("title").isLength({ min: 2, max: 200 }).trim(),
    body("description").optional().isLength({ max: 500 }).trim(),
    body("year").optional().isInt({ min: 1000, max: new Date().getFullYear() }),
    body("category")
      .optional()
      .isIn(["award", "publication", "recognition", "milestone"]),
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

      const poet = await Poet.findById(req.params.id);

      if (!poet) {
        return res.status(404).json({
          success: false,
          message: "Poet not found",
        });
      }

      const achievement = {
        title: req.body.title,
        description: req.body.description,
        year: req.body.year,
        category: req.body.category || "recognition",
        addedBy: req.user.userId,
        addedAt: new Date(),
      };

      poet.achievements.push(achievement);
      await poet.save();

      res.status(201).json({
        success: true,
        message: "Achievement added successfully",
        achievement,
      });
    } catch (error) {
      console.error("Add achievement error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add achievement",
      });
    }
  }
);

// Search poets
router.get("/search/advanced", poetOperationLimit, async (req, res) => {
  try {
    const {
      q,
      era,
      isAlive,
      country,
      language,
      sortBy = "relevance",
      page = 1,
      limit = 20,
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const skip = (page - 1) * limit;
    const searchQuery = {
      status: "active",
      isVerified: true,
    };

    // Text search
    searchQuery.$text = { $search: q };

    // Apply filters
    if (era && era !== "all") {
      searchQuery.era = era;
    }

    if (isAlive !== undefined) {
      searchQuery.isAlive = isAlive === "true";
    }

    if (country) {
      searchQuery.birthPlace = { $regex: country, $options: "i" };
    }

    if (language) {
      searchQuery.languages = { $in: [language] };
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case "relevance":
        sort = { score: { $meta: "textScore" } };
        break;
      case "name":
        sort = { name: 1 };
        break;
      case "poems":
        sort = { poemCount: -1 };
        break;
      case "followers":
        sort = { followersCount: -1 };
        break;
      default:
        sort = { score: { $meta: "textScore" } };
    }

    const poets = await Poet.find(searchQuery, {
      score: { $meta: "textScore" },
    })
      .populate("user", "name isVerified")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Poet.countDocuments(searchQuery);

    res.json({
      success: true,
      poets,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Search poets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search poets",
    });
  }
});

// Get poet analytics (for poet's own dashboard)
router.get("/analytics", poetAuth, async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Find poet profile
    const poet = await Poet.findOne({ user: req.user.userId });
    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet profile not found",
      });
    }

    // Calculate date range
    let startDate;
    switch (period) {
      case "7d":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get poem analytics
    const poemAnalytics = await Poem.aggregate([
      {
        $match: {
          poet: poet._id,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalPoems: { $sum: 1 },
          totalViews: { $sum: "$viewsCount" },
          totalLikes: { $sum: "$likesCount" },
          totalComments: { $sum: "$commentsCount" },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    // Get engagement trends
    const engagementTrends = await Poem.aggregate([
      {
        $match: {
          poet: poet._id,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          views: { $sum: "$viewsCount" },
          likes: { $sum: "$likesCount" },
          comments: { $sum: "$commentsCount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get category performance
    const categoryPerformance = await Poem.aggregate([
      {
        $match: {
          poet: poet._id,
          published: true,
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgViews: { $avg: "$viewsCount" },
          avgLikes: { $avg: "$likesCount" },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const analytics = {
      overview: poemAnalytics[0] || {
        totalPoems: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        averageRating: 0,
      },
      trends: engagementTrends,
      categoryPerformance,
      period,
    };

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Get poet analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
});

export default router;
