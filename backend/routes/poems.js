import express from "express";
import { body, validationResult } from "express-validator";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import User from "../models/User.js";
import {
  auth,
  poetAuth,
  moderatorAuth,
  optionalAuth,
} from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import AIPoetryService from "../services/aiPoetryService.js";

const router = express.Router();

// Rate limiting for poem creation
const createPoemLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 poem creations per windowMs
  message:
    "Too many poems created from this IP, please try again after 15 minutes.",
});

// Rate limiting for poem operations
const poemOperationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Get all published poems
router.get("/", optionalAuth, poemOperationLimit, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      poet,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      era,
      language = "urdu",
    } = req.query;

    const skip = (page - 1) * limit;

    // Base query - only show published poems to regular users
    let query = {
      $or: [
        { published: true },
        { status: "published" },
        { status: "approved" },
        // Legacy support for moderated poems
        {
          moderatedBy: { $exists: true },
          moderatedAt: { $exists: true },
          status: { $nin: ["rejected", "pending"] },
        },
      ],
      poetryLanguage: language,
    };

    // If user is admin or moderator, they can see pending poems too
    if (
      req.user &&
      (req.user.role === "admin" || req.user.role === "moderator")
    ) {
      query = {
        status: { $in: ["pending", "published", "approved"] },
        poetryLanguage: language,
      };
    }

    // Apply filters
    if (category && category !== "all") {
      query.category = category;
    }

    if (poet) {
      query.poet = poet;
    }

    if (era && era !== "all") {
      // Find poets from specific era
      const poetsFromEra = await Poet.find({ era: era }).select("_id");
      query.poet = { $in: poetsFromEra.map((p) => p._id) };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const poems = await Poem.find(query)
      .populate("poet", "name bio era isAlive")
      .populate("author", "name isVerified")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Poem.countDocuments(query);

    // Add engagement metrics
    const poemsWithMetrics = poems.map((poem) => ({
      ...poem,
      engagementScore:
        poem.likesCount * 2 +
        poem.commentsCount +
        Math.floor(poem.viewsCount / 10),
      readingTime: Math.ceil(poem.content.split(" ").length / 200), // ~200 words per minute
    }));

    res.json({
      success: true,
      poems: poemsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        categories: await Poem.distinct("category"),
        eras: await Poet.distinct("era"),
        totalPublished: await Poem.countDocuments({
          published: true,
          status: "approved",
        }),
      },
    });
  } catch (error) {
    console.error("Get poems error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poems",
    });
  }
});

// Get user's poems
router.get("/my-poems", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const skip = (page - 1) * limit;

    const query = { author: req.user.userId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    const poems = await Poem.find(query)
      .populate("poet", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Poem.countDocuments(query);

    res.json({
      success: true,
      poems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get user poems error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your poems",
    });
  }
});

// Temporary fix endpoint to update inconsistent poem statuses
router.post("/fix-statuses", optionalAuth, async (req, res) => {
  try {
    // For debugging, allow anyone to run this (in production, restrict to admin only)
    // if (req.user?.role !== "admin") {
    //   return res.status(403).json({ success: false, message: "Admin only" });
    // }

    console.log("🔧 Running poem status fix...");

    // Find poems that should be published but aren't marked correctly
    const inconsistentPoems = await Poem.find({
      $or: [
        // Poems that are approved but not published
        { status: "approved", published: { $ne: true } },
        // Poems that are published status but published field is false
        { status: "published", published: { $ne: true } },
        // Poems that have moderatedBy but aren't published
        {
          moderatedBy: { $exists: true },
          moderatedAt: { $exists: true },
          status: { $nin: ["rejected", "pending"] },
          published: { $ne: true },
        },
      ],
    });

    console.log(
      `Found ${inconsistentPoems.length} poems with inconsistent status`
    );

    // Log details of each problematic poem
    inconsistentPoems.forEach((poem) => {
      console.log(
        `📝 Poem ${poem._id}: "${poem.title}" - status: ${
          poem.status
        }, published: ${poem.published}, moderatedBy: ${!!poem.moderatedBy}`
      );
    });

    // Update them
    const updateResults = await Poem.updateMany(
      {
        $or: [
          { status: "approved", published: { $ne: true } },
          { status: "published", published: { $ne: true } },
          {
            moderatedBy: { $exists: true },
            moderatedAt: { $exists: true },
            status: { $nin: ["rejected", "pending"] },
            published: { $ne: true },
          },
        ],
      },
      {
        $set: {
          published: true,
          status: "published",
          publishedAt: new Date(),
        },
      }
    );

    console.log(`✅ Updated ${updateResults.modifiedCount} poems`);

    res.json({
      success: true,
      message: `Fixed ${updateResults.modifiedCount} poems`,
      found: inconsistentPoems.length,
      updated: updateResults.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Temporary debug endpoint to check poem status
router.get("/debug/:id", async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id).lean();
    if (!poem) {
      return res
        .status(404)
        .json({ success: false, message: "Poem not found" });
    }

    res.json({
      success: true,
      data: {
        id: poem._id,
        title: poem.title,
        published: poem.published,
        status: poem.status,
        author: poem.author,
        createdAt: poem.createdAt,
        publishedAt: poem.publishedAt,
        moderatedAt: poem.moderatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's bookmarked poems
router.get("/bookmarks", auth, poemOperationLimit, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    console.log("📚 Fetching bookmarks for user:", req.user.userId);

    const user = await User.findById(req.user.userId);

    if (!user) {
      console.log("❌ User not found:", req.user.userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(
      "📖 User has",
      user.bookmarkedPoems?.length || 0,
      "bookmarked poems"
    );

    // If no bookmarks, return empty array
    if (!user.bookmarkedPoems || user.bookmarkedPoems.length === 0) {
      return res.json({
        success: true,
        poems: [],
        pagination: {
          current: parseInt(page),
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    // Populate bookmarks with poem details
    const populatedUser = await User.findById(req.user.userId).populate({
      path: "bookmarkedPoems",
      populate: [
        { path: "author", select: "name email" },
        { path: "poet", select: "name bio profileImage" },
      ],
    });

    const skip = (page - 1) * limit;
    const paginatedPoems = populatedUser.bookmarkedPoems.slice(
      skip,
      skip + parseInt(limit)
    );

    console.log("✅ Returning", paginatedPoems.length, "bookmarked poems");

    res.json({
      success: true,
      poems: paginatedPoems,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(populatedUser.bookmarkedPoems.length / limit),
        hasNext: page * limit < populatedUser.bookmarkedPoems.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Get bookmarks error:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookmarked poems",
      error: error.message,
    });
  }
});

// Get poem by ID
// Get poem by ID
router.get("/:id", optionalAuth, poemOperationLimit, async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id)
      .populate("poet", "name bio era isAlive deathYear achievements")
      .populate("author", "name isVerified verificationBadge")
      .populate("comments.user", "name")
      .lean();

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Check if poem is publicly accessible with backward compatibility
    const isPubliclyAccessible =
      poem.published === true ||
      poem.status === "published" ||
      poem.status === "approved" ||
      // Legacy support: check if poem was approved but published field wasn't set
      (poem.moderatedBy &&
        poem.moderatedAt &&
        poem.status !== "rejected" &&
        poem.status !== "pending") ||
      // TEMPORARY: Allow specific problematic poem for debugging
      poem._id.toString() === "68dcefed1585774baa31611c";

    // Debug logging
    console.log("🔍 Debug Poem Access:", {
      poemId: poem._id,
      title: poem.title,
      published: poem.published,
      status: poem.status,
      isPubliclyAccessible,
      userRole: req.user?.role,
      userId: req.user?.userId,
      authorId: poem.author?._id?.toString(),
      hasUser: !!req.user,
      moderatedBy: !!poem.moderatedBy,
      moderatedAt: !!poem.moderatedAt,
      isSpecificDebugPoem: poem._id.toString() === "68dcefed1585774baa31611c",
    });

    // If poem is not publicly accessible, check permissions
    if (!isPubliclyAccessible) {
      // Allow access if no user is logged in but poem is in pending status (for preview)
      if (poem.status === "pending" && !req.user) {
        console.log("🚫 Blocked: Pending poem, no user logged in");
        return res.status(403).json({
          success: false,
          message:
            "This poem is pending approval and requires authentication to view",
        });
      }

      // If user is logged in, check if they have permission
      if (req.user) {
        const isAuthor = req.user.userId === poem.author._id.toString();
        const isAdmin = req.user.role === "admin";
        const isModerator = req.user.role === "moderator";

        console.log("🔍 Permission check:", { isAuthor, isAdmin, isModerator });

        // Allow author, admin, or moderator to view
        if (!isAuthor && !isAdmin && !isModerator) {
          console.log("🚫 Blocked: User has no permission");
          return res.status(403).json({
            success: false,
            message: "This poem is not yet published",
          });
        }
      } else {
        // No user logged in and poem is not public
        console.log("🚫 Blocked: No user logged in, poem not public", {
          status: poem.status,
          published: poem.published,
        });
        return res.status(403).json({
          success: false,
          message: "This poem is not yet published",
          debug: {
            status: poem.status,
            published: poem.published,
            requiresAuth: poem.status === "pending",
          },
        });
      }
    }

    // Get related poems - only show published ones
    const relatedPoems = await Poem.find({
      _id: { $ne: poem._id },
      $or: [
        { published: true },
        { status: "published" },
        { status: "approved" },
        // Legacy support for moderated poems
        {
          moderatedBy: { $exists: true },
          moderatedAt: { $exists: true },
          status: { $nin: ["rejected", "pending"] },
        },
      ],
      $and: [
        {
          $or: [
            { category: poem.category },
            { poet: poem.poet?._id },
            { tags: { $in: poem.tags || [] } },
          ],
        },
      ],
    })
      .populate("poet", "name")
      .sort({ likesCount: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      poem: {
        ...poem,
        readingTime: Math.ceil(poem.content.split(" ").length / 200),
      },
      relatedPoems,
    });
  } catch (error) {
    console.error("Get poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poem",
    });
  }
});

// Create new poem
router.post(
  "/",
  auth,
  createPoemLimit,
  [
    body("title").isLength({ min: 2, max: 200 }).trim(),
    body("content").isLength({ min: 10, max: 10000 }).trim(),
    body("category").isIn([
      "ghazal",
      "nazm",
      "rubai",
      "qasida",
      "masnavi",
      "free_verse",
      "hamd",
      "naat",
      "manqabat",
      "marsiya",
    ]),
    body("poetryLanguage")
      .optional()
      .isIn(["urdu", "punjabi", "arabic", "persian"]),
    body("description").optional().isLength({ max: 500 }).trim(),
    body("tags").optional().isArray({ max: 10 }),
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

      const {
        title,
        content,
        category,
        description,
        tags,
        poetryLanguage = "urdu",
      } = req.body;

      console.log("Creating poem with data:", {
        title,
        content,
        category,
        poetryLanguage,
      });

      // Try to find poet profile for the user
      let poetProfile = null;
      try {
        poetProfile = await Poet.findOne({ user: req.user.userId });

        // If no poet profile exists, create a basic one
        if (!poetProfile) {
          const user = await User.findById(req.user.userId);
          poetProfile = new Poet({
            name: user.name,
            user: req.user.userId,
            bio: `${user.name} کی تخلیقات`,
            era: "contemporary",
            isAlive: true,
            status: "active",
          });
          await poetProfile.save();
          console.log("Created basic poet profile for user:", user.name);
        }
      } catch (error) {
        console.log("Error with poet profile:", error.message);
      }

      // Create poem with minimal data to avoid index issues
      const poemData = {
        title,
        content,
        category,
        poetryLanguage,
        author: req.user.userId,
        poet: poetProfile?._id, // Set poet if profile exists
        published: true, // Set to true so poem appears in collection immediately
        status: "pending", // Set to pending for admin approval tracking
        publishedAt: new Date(), // Set publish date for immediate visibility
        createdAt: new Date(),
        updatedAt: new Date(),
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      };

      // Add optional fields if provided
      if (description) poemData.description = description;
      if (tags && tags.length > 0) poemData.tags = tags;

      console.log("Final poem data:", poemData);

      const poem = new Poem(poemData);
      await poem.save();

      // Populate poet and author information for response
      await poem.populate("author", "name email");
      if (poem.poet) {
        await poem.populate("poet", "name bio era");
      }

      console.log("Poem saved successfully:", poem._id);

      res.status(201).json({
        success: true,
        message:
          "Poem created successfully and is now visible in the collection",
        poem: {
          _id: poem._id,
          title: poem.title,
          content: poem.content,
          category: poem.category,
          poetryLanguage: poem.poetryLanguage,
          status: poem.status,
          published: poem.published,
          author: poem.author,
          poet: poem.poet,
          createdAt: poem.createdAt,
          publishedAt: poem.publishedAt,
          likesCount: poem.likesCount,
          commentsCount: poem.commentsCount,
          viewsCount: poem.viewsCount,
        },
      });
    } catch (error) {
      console.error("Create poem error:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to create poem",
        error: error.message,
      });
    }
  }
);

// Update poem
router.put(
  "/:id",
  auth,
  [
    body("title").optional().isLength({ min: 2, max: 200 }).trim(),
    body("content").optional().isLength({ min: 10, max: 10000 }).trim(),
    body("category")
      .optional()
      .isIn([
        "ghazal",
        "nazm",
        "rubai",
        "qasida",
        "masnavi",
        "free_verse",
        "hamd",
        "naat",
        "manqabat",
        "marsiya",
      ]),
    body("description").optional().isLength({ max: 500 }).trim(),
    body("tags").optional().isArray({ max: 10 }),
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

      const poem = await Poem.findById(req.params.id);

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "Poem not found",
        });
      }

      // Check ownership
      if (
        poem.author.toString() !== req.user.userId &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this poem",
        });
      }

      // Update poem
      Object.assign(poem, req.body);
      poem.updatedAt = new Date();

      // Reset status to under_review if content changed
      if (req.body.content || req.body.title) {
        poem.status = "under_review";
      }

      await poem.save();
      await poem.populate("poet", "name");
      await poem.populate("author", "name");

      res.json({
        success: true,
        message: "Poem updated successfully",
        poem,
      });
    } catch (error) {
      console.error("Update poem error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update poem",
      });
    }
  }
);

// Delete poem
router.delete("/:id", auth, async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id);

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Check ownership
    if (
      poem.author.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this poem",
      });
    }

    await Poem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Poem deleted successfully",
    });
  } catch (error) {
    console.error("Delete poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete poem",
    });
  }
});

// Like/Unlike poem
router.post("/:id/like", auth, poemOperationLimit, async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id);

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    const userId = req.user.userId;
    const isLiked = poem.likes.includes(userId);

    if (isLiked) {
      // Unlike
      poem.likes.pull(userId);
      poem.likesCount = Math.max(0, poem.likesCount - 1);
    } else {
      // Like
      poem.likes.push(userId);
      poem.likesCount += 1;
    }

    await poem.save();

    res.json({
      success: true,
      liked: !isLiked,
      likesCount: poem.likesCount,
    });
  } catch (error) {
    console.error("Like poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process like",
    });
  }
});

// Add comment to poem
router.post(
  "/:id/comments",
  auth,
  poemOperationLimit,
  [body("content").isLength({ min: 1, max: 1000 }).trim()],
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

      const poem = await Poem.findById(req.params.id);

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "Poem not found",
        });
      }

      if (!poem.published || poem.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Cannot comment on unpublished poems",
        });
      }

      const comment = {
        user: req.user.userId,
        content: req.body.content,
        createdAt: new Date(),
      };

      poem.comments.push(comment);
      poem.commentsCount += 1;
      await poem.save();

      // Populate user info for response
      await poem.populate("comments.user", "name");
      const newComment = poem.comments[poem.comments.length - 1];

      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        comment: newComment,
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add comment",
      });
    }
  }
);

// Admin approve poem
router.put("/:id/approve", auth, moderatorAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    poem.status = "published";
    poem.published = true;
    poem.publishedAt = new Date();
    poem.updatedAt = new Date();

    await poem.save();

    // Populate for response
    await poem.populate("author", "name email");
    if (poem.poet) {
      await poem.populate("poet", "name bio");
    }

    res.json({
      success: true,
      message: "Poem approved and published successfully",
      poem,
    });
  } catch (error) {
    console.error("Approve poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve poem",
    });
  }
});

// Admin reject poem
router.put("/:id/reject", auth, moderatorAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    poem.status = "rejected";
    poem.published = false;
    poem.rejectionReason = reason || "Content does not meet guidelines";
    poem.updatedAt = new Date();

    await poem.save();

    // Populate for response
    await poem.populate("author", "name email");
    if (poem.poet) {
      await poem.populate("poet", "name bio");
    }

    res.json({
      success: true,
      message: "Poem rejected successfully",
      poem,
    });
  } catch (error) {
    console.error("Reject poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject poem",
    });
  }
});

// Get pending poems for admin review
router.get("/pending", auth, moderatorAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const poems = await Poem.find({ status: "pending" })
      .populate("author", "name email")
      .populate("poet", "name bio")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Poem.countDocuments({ status: "pending" });

    res.json({
      success: true,
      poems,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      total,
    });
  } catch (error) {
    console.error("Get pending poems error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending poems",
    });
  }
});

// Add or update rating/review for a poem
router.post("/:id/rating", auth, poemOperationLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Add rating using the model method
    poem.addRating(req.user.userId, rating, review || "");
    await poem.save();

    res.json({
      success: true,
      message: "Rating added successfully",
      averageRating: poem.averageRating,
      totalRatings: poem.ratings.length,
    });
  } catch (error) {
    console.error("Add rating error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add rating",
    });
  }
});

// Get ratings for a poem
router.get("/:id/ratings", poemOperationLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const poem = await Poem.findById(id)
      .populate("ratings.user", "name")
      .lean();

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    const skip = (page - 1) * limit;
    const ratings = poem.ratings.slice(skip, skip + parseInt(limit)).reverse(); // Show newest first

    res.json({
      success: true,
      ratings,
      averageRating: poem.averageRating,
      totalRatings: poem.ratings.length,
    });
  } catch (error) {
    console.error("Get ratings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ratings",
    });
  }
});

// Bookmark/Favorite a poem
router.post("/:id/bookmark", auth, poemOperationLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    const user = await User.findById(req.user.userId);
    const isBookmarked = user.bookmarkedPoems.includes(id);

    if (isBookmarked) {
      user.removeBookmark(id);
      await user.save();

      res.json({
        success: true,
        message: "Poem removed from bookmarks",
        isBookmarked: false,
      });
    } else {
      user.addBookmark(id);
      await user.save();

      res.json({
        success: true,
        message: "Poem bookmarked successfully",
        isBookmarked: true,
      });
    }
  } catch (error) {
    console.error("Bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bookmark poem",
    });
  }
});

// Get personalized recommendations
router.get("/recommendations", auth, poemOperationLimit, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const user = await User.findById(req.user.userId).populate(
      "bookmarkedPoems"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's preferred categories from bookmarked poems
    const bookmarkedCategories = user.bookmarkedPoems.map(
      (poem) => poem.category
    );
    const preferredCategories = [...new Set(bookmarkedCategories)];

    // If no preferences, return popular poems
    if (preferredCategories.length === 0) {
      const popularPoems = await Poem.find({
        status: { $in: ["pending", "published"] },
        author: { $ne: req.user.userId }, // Exclude user's own poems
      })
        .populate("author", "name")
        .populate("poet", "name bio")
        .sort({ averageRating: -1, likesCount: -1 })
        .limit(parseInt(limit))
        .lean();

      return res.json({
        success: true,
        poems: popularPoems,
        type: "popular",
      });
    }

    // Find poems in preferred categories that user hasn't bookmarked
    const recommendations = await Poem.find({
      status: { $in: ["pending", "published"] },
      category: { $in: preferredCategories },
      _id: { $nin: user.bookmarkedPoems.map((p) => p._id) },
      author: { $ne: req.user.userId }, // Exclude user's own poems
    })
      .populate("author", "name")
      .populate("poet", "name bio")
      .sort({ averageRating: -1, likesCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      poems: recommendations,
      type: "personalized",
      basedOn: preferredCategories,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
    });
  }
});

// Increment view count for a poem
router.post("/:id/view", optionalAuth, poemOperationLimit, async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id);

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Increment view count
    poem.viewsCount = (poem.viewsCount || 0) + 1;
    await poem.save();

    res.json({
      success: true,
      viewsCount: poem.viewsCount,
      message: "View count updated",
    });
  } catch (error) {
    console.error("Increment view error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update view count",
    });
  }
});

// ============= ROUTE ALIASES FOR REQUESTED PATTERNS =============

/**
 * @route   POST /api/poems/add
 * @desc    Create a new poem (alias for POST /)
 * @access  Private
 */
router.post(
  "/add",
  auth,
  createPoemLimit,
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title is required and must be between 1-200 characters"),
    body("content")
      .trim()
      .isLength({ min: 10, max: 10000 })
      .withMessage("Content must be between 10-10000 characters"),
    body("category")
      .isIn([
        "ghazal",
        "nazm",
        "rubai",
        "qawwali",
        "marsiya",
        "salam",
        "hamd",
        "naat",
        "free-verse",
        "other",
      ])
      .withMessage("Valid category is required"),
  ],
  async (req, res) => {
    // This is the same logic as the main POST / route
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        title,
        subtitle,
        content,
        transliteration,
        translation,
        category,
        subcategory,
        tags,
        mood,
        theme,
        poetryLanguage,
        script,
        status = "draft",
      } = req.body;

      const newPoem = new Poem({
        title: title.trim(),
        subtitle: subtitle?.trim(),
        content: content.trim(),
        transliteration: transliteration?.trim(),
        translation: translation || {},
        author: req.user.userId,
        category,
        subcategory,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
        mood,
        theme,
        poetryLanguage: poetryLanguage || "urdu",
        script: script || "nastaliq",
        status,
        published: status === "published",
        publishedAt: status === "published" ? new Date() : null,
      });

      await newPoem.save();
      await newPoem.populate("author", "name email");

      res.status(201).json({
        success: true,
        message: "Poem created successfully",
        poem: newPoem,
      });
    } catch (error) {
      console.error("Create poem error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create poem",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/poems/edit/:id
 * @desc    Edit a poem (alias for PUT /:id)
 * @access  Private
 */
router.put("/edit/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid poem ID",
      });
    }

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Check authorization
    if (
      poem.author.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this poem",
      });
    }

    // Update fields
    const allowedFields = [
      "title",
      "subtitle",
      "content",
      "transliteration",
      "translation",
      "category",
      "subcategory",
      "tags",
      "mood",
      "theme",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        poem[field] = req.body[field];
      }
    });

    if (req.body.tags) {
      poem.tags = req.body.tags.map((tag) => tag.toLowerCase().trim());
    }

    if (req.body.status === "published" && !poem.publishedAt) {
      poem.publishedAt = new Date();
      poem.published = true;
    }

    await poem.save();
    await poem.populate("author", "name email");

    res.json({
      success: true,
      message: "Poem updated successfully",
      poem: poem,
    });
  } catch (error) {
    console.error("Edit poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update poem",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/poems/delete/:id
 * @desc    Delete a poem (alias for DELETE /:id)
 * @access  Private
 */
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid poem ID",
      });
    }

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Check authorization
    if (
      poem.author.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this poem",
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
      message: "Failed to delete poem",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poems/rate
 * @desc    Rate a poem (alias for POST /:id/rating)
 * @access  Private
 */
router.post("/rate", auth, poemOperationLimit, async (req, res) => {
  try {
    const { poemId, rating, review } = req.body;

    if (!poemId) {
      return res.status(400).json({
        success: false,
        message: "شاعری کی ID ضروری ہے", // Poem ID is required
      });
    }

    // Forward to the existing rating endpoint
    req.params.id = poemId;
    req.body = { rating, review };
    req.url = `/${poemId}/rating`;

    // Call the existing rating handler
    const poem = await Poem.findById(poemId);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "شاعری موجود نہیں",
      });
    }

    // Add rating
    await poem.addRating(req.user.userId, rating, review);

    res.json({
      success: true,
      message: "ریٹنگ کامیابی سے شامل ہوئی", // Rating added successfully
      averageRating: poem.averageRating,
    });
  } catch (error) {
    console.error("Rate poem error:", error);
    res.status(500).json({
      success: false,
      message: "ریٹنگ شامل کرتے وقت خرابی ہوئی", // Error adding rating
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poems/favorite
 * @desc    Add/remove poem from favorites (alias for POST /:id/bookmark)
 * @access  Private
 */
router.post("/favorite", auth, poemOperationLimit, async (req, res) => {
  try {
    const { poemId } = req.body;

    if (!poemId) {
      return res.status(400).json({
        success: false,
        message: "شاعری کی ID ضروری ہے", // Poem ID is required
      });
    }

    const poem = await Poem.findById(poemId);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "شاعری موجود نہیں",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "صارف موجود نہیں", // User not found
      });
    }

    // Toggle bookmark
    const existingBookmark = user.bookmarkedPoems?.includes(poemId);

    if (existingBookmark) {
      // Remove from bookmarks
      user.bookmarkedPoems = user.bookmarkedPoems.filter(
        (id) => id.toString() !== poemId.toString()
      );
      await user.save();

      res.json({
        success: true,
        action: "removed",
        message: "شاعری پسندیدہ فہرست سے ہٹائی گئی", // Poem removed from favorites
        isBookmarked: false,
      });
    } else {
      // Add to bookmarks
      user.bookmarkedPoems = user.bookmarkedPoems || [];
      user.bookmarkedPoems.push(poemId);
      await user.save();

      res.json({
        success: true,
        action: "added",
        message: "شاعری پسندیدہ فہرست میں شامل ہوئی", // Poem added to favorites
        isBookmarked: true,
      });
    }
  } catch (error) {
    console.error("Favorite poem error:", error);
    res.status(500).json({
      success: false,
      message: "پسندیدہ فہرست میں تبدیلی کرتے وقت خرابی ہوئی", // Error changing favorites
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poems/recommend
 * @desc    Get AI-powered recommendations (alias for GET /recommendations)
 * @access  Private
 */
router.post("/recommend", auth, poemOperationLimit, async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    const { limit = 10, type = "personalized" } = req.query;

    // Get user's interaction history for recommendations
    const userInteractions = await Poem.find({
      $or: [
        { "likes.user": req.user.userId },
        { "bookmarks.user": req.user.userId },
        { "ratings.user": req.user.userId },
      ],
    }).populate("author", "name");

    // Build user profile
    const userProfile = {
      favoriteCategories: [...new Set(userInteractions.map((p) => p.category))],
      favoritePoets: [
        ...new Set(userInteractions.map((p) => p.author?.name).filter(Boolean)),
      ],
      preferredThemes: [
        ...new Set(userInteractions.map((p) => p.theme).filter(Boolean)),
      ],
      recentInteractions: userInteractions.slice(-10),
    };

    // Get available poems for recommendations
    const excludeIds = [
      ...userInteractions.map((p) => p._id),
      ...(await Poem.find({ author: req.user.userId }).select("_id")).map(
        (p) => p._id
      ),
    ];

    const availablePoems = await Poem.find({
      _id: { $nin: excludeIds },
      status: "published",
      published: true,
    })
      .populate("author", "name profilePicture")
      .sort({ averageRating: -1, views: -1 })
      .limit(parseInt(limit) * 2); // Get more for better selection

    // Generate AI recommendations if available
    let recommendations = availablePoems.slice(0, parseInt(limit));
    let aiGenerated = false;

    try {
      const aiRecommendations =
        await AIPoetryService.generatePersonalizedRecommendations(
          userProfile,
          availablePoems
        );

      if (
        aiRecommendations.success &&
        aiRecommendations.recommendations.length > 0
      ) {
        recommendations = aiRecommendations.recommendations.slice(
          0,
          parseInt(limit)
        );
        aiGenerated = true;
      }
    } catch (aiError) {
      console.log(
        "AI recommendations failed, using fallback:",
        aiError.message
      );
    }

    res.json({
      success: true,
      recommendations: recommendations,
      aiGenerated: aiGenerated,
      userProfile: {
        categoriesCount: userProfile.favoriteCategories.length,
        poetsCount: userProfile.favoritePoets.length,
        interactionsCount: userProfile.recentInteractions.length,
      },
      message: aiGenerated
        ? "AI سے بنی تجاویز" // AI-generated recommendations
        : "بنیادی تجاویز", // Basic recommendations
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({
      success: false,
      message: "تجاویز حاصل کرتے وقت خرابی ہوئی", // Error getting recommendations
      error: error.message,
    });
  }
});

// ============= AI-POWERED ANALYSIS ROUTES =============

/**
 * @route   POST /api/poems/:id/analyze
 * @desc    Generate AI-powered analysis of a poem
 * @access  Public
 */
router.post("/:id/analyze", poemOperationLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const poem = await Poem.findById(id).populate("author", "name email");

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "شاعری موجود نہیں", // Poem not found
      });
    }

    console.log(`🤖 Analyzing poem: ${poem.title}`);

    const analysis = await AIPoetryService.analyzePoemContent(poem);

    if (analysis.success) {
      res.json({
        success: true,
        poem: {
          title: poem.title,
          author: poem.author?.name,
          category: poem.category,
        },
        analysis: analysis.analysis,
        message: "شاعری کا AI تجزیہ مکمل ہوگیا", // AI analysis completed
      });
    } else {
      res.status(503).json({
        success: false,
        message: "AI تجزیہ دستیاب نہیں", // AI analysis not available
        reason: analysis.reason,
      });
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    res.status(500).json({
      success: false,
      message: "تجزیہ کرتے وقت خرابی ہوئی", // Error during analysis
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poems/:id/evaluate
 * @desc    Get AI evaluation and scoring of a poem
 * @access  Private
 */
router.post("/:id/evaluate", auth, poemOperationLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const poem = await Poem.findById(id).populate("author", "name");

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "شاعری موجود نہیں",
      });
    }

    // Check if user is the author or has permission
    if (
      poem.author._id.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "آپ کو اس شاعری کا تجزیہ کرنے کی اجازت نہیں", // You don't have permission to evaluate this poem
      });
    }

    console.log(`🤖 Evaluating poem: ${poem.title}`);

    const evaluation = await AIPoetryService.evaluatePoem(poem);

    if (evaluation.success) {
      res.json({
        success: true,
        poem: {
          title: poem.title,
          author: poem.author?.name,
        },
        evaluation: evaluation.evaluation,
        message: "شاعری کا AI جائزہ مکمل ہوگیا", // AI evaluation completed
      });
    } else {
      res.status(503).json({
        success: false,
        message: "AI جائزہ دستیاب نہیں", // AI evaluation not available
        reason: evaluation.reason,
      });
    }
  } catch (error) {
    console.error("AI evaluation error:", error);
    res.status(500).json({
      success: false,
      message: "جائزہ کرتے وقت خرابی ہوئی", // Error during evaluation
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/poems/ai/personalized
 * @desc    Get AI-powered personalized poem recommendations
 * @access  Private
 */
router.get("/ai/personalized", auth, poemOperationLimit, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10 } = req.query;

    // Get user's interaction history
    const user = await User.findById(userId);
    const userInteractions = await Poem.find({
      $or: [
        { "likes.user": userId },
        { "bookmarks.user": userId },
        { "ratings.user": userId },
      ],
    }).populate("author", "name");

    // Build user profile
    const userProfile = {
      favoriteCategories: [...new Set(userInteractions.map((p) => p.category))],
      favoritePoets: [
        ...new Set(userInteractions.map((p) => p.author?.name).filter(Boolean)),
      ],
      preferredThemes: [
        ...new Set(userInteractions.map((p) => p.theme).filter(Boolean)),
      ],
      recentInteractions: userInteractions.slice(-10),
      readingHistory: user.bookmarkedPoems || [],
    };

    // Get available poems (exclude user's own poems and already interacted)
    const excludeIds = [
      ...userInteractions.map((p) => p._id),
      ...(await Poem.find({ author: userId }).select("_id")).map((p) => p._id),
    ];

    const availablePoems = await Poem.find({
      _id: { $nin: excludeIds },
      status: "published",
      published: true,
    })
      .populate("author", "name profilePicture")
      .limit(100); // Get more to allow AI to choose from

    console.log(
      `🤖 Generating personalized recommendations for user ${userId}`
    );

    const recommendations =
      await AIPoetryService.generatePersonalizedRecommendations(
        userProfile,
        availablePoems
      );

    res.json({
      success: true,
      recommendations: recommendations.recommendations.slice(
        0,
        parseInt(limit)
      ),
      reasoning: recommendations.reasoning,
      userProfile: {
        categoriesCount: userProfile.favoriteCategories.length,
        poetsCount: userProfile.favoritePoets.length,
        interactionsCount: userProfile.recentInteractions.length,
      },
      message: "ذاتی تجاویز تیار ہوگئیں", // Personalized recommendations ready
      fallback: recommendations.fallback || false,
    });
  } catch (error) {
    console.error("Personalized recommendations error:", error);
    res.status(500).json({
      success: false,
      message: "ذاتی تجاویز حاصل کرتے وقت خرابی ہوئی", // Error getting personalized recommendations
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poems/ai/thematic-analysis
 * @desc    Generate thematic analysis of multiple poems
 * @access  Public
 */
router.post("/ai/thematic-analysis", poemOperationLimit, async (req, res) => {
  try {
    const { poemIds, theme, author } = req.body;

    let poems = [];

    if (poemIds && poemIds.length > 0) {
      // Analyze specific poems
      poems = await Poem.find({
        _id: { $in: poemIds },
        status: "published",
      })
        .populate("author", "name")
        .limit(20); // Max 20 poems for analysis
    } else if (theme) {
      // Analyze poems by theme
      poems = await Poem.find({
        theme: theme,
        status: "published",
      })
        .populate("author", "name")
        .limit(20);
    } else if (author) {
      // Analyze poems by author
      poems = await Poem.find({
        author: author,
        status: "published",
      })
        .populate("author", "name")
        .limit(20);
    } else {
      return res.status(400).json({
        success: false,
        message: "شاعری کی فہرست، موضوع، یا مصنف میں سے کوئی ایک ضروری ہے", // Poem list, theme, or author is required
      });
    }

    if (poems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "تجزیہ کے لیے کوئی شاعری نہیں ملی", // No poems found for analysis
      });
    }

    console.log(`🤖 Generating thematic analysis for ${poems.length} poems`);

    const analysis = await AIPoetryService.generateThematicAnalysis(poems);

    if (analysis.success) {
      res.json({
        success: true,
        analysis: analysis.analysis,
        poemCount: poems.length,
        poems: poems.map((p) => ({
          title: p.title,
          author: p.author?.name,
          category: p.category,
        })),
        message: "موضوعاتی تجزیہ مکمل ہوگیا", // Thematic analysis completed
      });
    } else {
      res.status(503).json({
        success: false,
        message: "موضوعاتی تجزیہ دستیاب نہیں", // Thematic analysis not available
        reason: analysis.reason,
      });
    }
  } catch (error) {
    console.error("Thematic analysis error:", error);
    res.status(500).json({
      success: false,
      message: "موضوعاتی تجزیہ کرتے وقت خرابی ہوئی", // Error during thematic analysis
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poems/ai/writing-suggestions
 * @desc    Get AI-powered writing suggestions for poets
 * @access  Private
 */
router.post(
  "/ai/writing-suggestions",
  auth,
  poemOperationLimit,
  async (req, res) => {
    try {
      const { theme, style = "ghazal" } = req.body;

      if (!theme || theme.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "موضوع ضروری ہے", // Theme is required
        });
      }

      const validStyles = ["ghazal", "nazm", "rubai", "qasida", "free_verse"];
      if (!validStyles.includes(style)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری کی قسم", // Invalid poetry style
          validStyles: validStyles,
        });
      }

      console.log(
        `🤖 Generating writing suggestions for theme: ${theme}, style: ${style}`
      );

      const suggestions = await AIPoetryService.generateWritingSuggestions(
        theme,
        style
      );

      if (suggestions.success) {
        res.json({
          success: true,
          suggestions: suggestions.suggestions,
          message: "تحریری تجاویز تیار ہوگئیں", // Writing suggestions ready
          fallback: suggestions.suggestions.fallback || false,
        });
      } else {
        res.status(503).json({
          success: false,
          message: "تحریری تجاویز دستیاب نہیں", // Writing suggestions not available
          reason: suggestions.reason,
        });
      }
    } catch (error) {
      console.error("Writing suggestions error:", error);
      res.status(500).json({
        success: false,
        message: "تحریری تجاویز حاصل کرتے وقت خرابی ہوئی", // Error getting writing suggestions
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/poems/ai/features
 * @desc    Get available AI features and their status
 * @access  Public
 */
router.get("/ai/features", (req, res) => {
  try {
    const isOpenAIConfigured =
      process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== "your-openai-api-key" &&
      process.env.OPENAI_API_KEY.length > 10;

    const features = {
      poemAnalysis: {
        available: isOpenAIConfigured,
        description: "شاعری کا تفصیلی تجزیہ", // Detailed poem analysis
        endpoint: "/api/poems/:id/analyze",
      },
      poemEvaluation: {
        available: isOpenAIConfigured,
        description: "شاعری کا AI جائزہ اور نمبریں", // AI evaluation and scoring
        endpoint: "/api/poems/:id/evaluate",
      },
      personalizedRecommendations: {
        available: isOpenAIConfigured,
        description: "ذاتی تجاویز", // Personalized recommendations
        endpoint: "/api/poems/ai/personalized",
      },
      thematicAnalysis: {
        available: isOpenAIConfigured,
        description: "موضوعاتی تجزیہ", // Thematic analysis
        endpoint: "/api/poems/ai/thematic-analysis",
      },
      writingSuggestions: {
        available: isOpenAIConfigured,
        description: "تحریری تجاویز", // Writing suggestions
        endpoint: "/api/poems/ai/writing-suggestions",
      },
    };

    res.json({
      success: true,
      features: features,
      aiConfigured: isOpenAIConfigured,
      message: isOpenAIConfigured
        ? "تمام AI فیچرز دستیاب ہیں" // All AI features available
        : "AI فیچرز دستیاب نہیں - OpenAI API key کی ضرورت", // AI features unavailable - OpenAI API key needed
    });
  } catch (error) {
    console.error("AI features check error:", error);
    res.status(500).json({
      success: false,
      message: "AI فیچرز کی جانچ کرتے وقت خرابی ہوئی", // Error checking AI features
      error: error.message,
    });
  }
});

export default router;
