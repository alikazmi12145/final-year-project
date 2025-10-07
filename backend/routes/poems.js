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

// Get user's bookmarked poems
router.get("/bookmarks", auth, poemOperationLimit, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user.userId).populate({
      path: "bookmarkedPoems",
      populate: [
        { path: "author", select: "name" },
        { path: "poet", select: "name bio" },
      ],
      options: {
        skip: skip,
        limit: parseInt(limit),
        sort: { createdAt: -1 },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      poems: user.bookmarkedPoems,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(user.bookmarkedPoems.length / limit),
        hasNext: page * limit < user.bookmarkedPoems.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookmarked poems",
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

export default router;
