import express from "express";
import { body, validationResult } from "express-validator";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import User from "../models/User.js";
import ReadingHistory from "../models/ReadingHistory.js";
import Bookmark from "../models/Bookmark.js";
import {
  auth,
  poetAuth,
  moderatorAuth,
  optionalAuth,
} from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
// import AIPoetryService from "../services/aiPoetryService.js";

const router = express.Router();

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  max: 200, // Increased for development - limit each IP to 200 requests per minute
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

    const isPrivilegedUser =
      req.user && (req.user.role === "admin" || req.user.role === "moderator");

    const queryConditions = [{ poetryLanguage: language }];

    if (isPrivilegedUser) {
      queryConditions.push({
        status: { $in: ["pending", "published", "approved"] },
      });
    } else {
      queryConditions.push({
        $or: [
          { published: true },
          { status: "published" },
          { status: "approved" },
          {
            moderatedBy: { $exists: true },
            moderatedAt: { $exists: true },
            status: { $nin: ["rejected", "pending"] },
          },
        ],
      });
    }

    // Apply filters
    if (category && category !== "all") {
      queryConditions.push({ category });
    }

    if (poet) {
      queryConditions.push({ poet });
    }

    if (era && era !== "all") {
      // Find poets from specific era
      const poetsFromEra = await Poet.find({ era: era }).select("_id");
      queryConditions.push({
        poet: { $in: poetsFromEra.map((p) => p._id) },
      });
    }

    const normalizedSearch = typeof search === "string" ? search.trim() : "";

    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");
      const [matchingPoets, matchingAuthors] = await Promise.all([
        Poet.find({ name: searchRegex }).select("_id"),
        User.find({ name: searchRegex }).select("_id"),
      ]);

      const searchClauses = [
        { title: { $regex: searchRegex } },
        { content: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
      ];

      if (matchingPoets.length > 0) {
        searchClauses.push({
          poet: { $in: matchingPoets.map((matchingPoet) => matchingPoet._id) },
        });
      }

      if (matchingAuthors.length > 0) {
        searchClauses.push({
          author: {
            $in: matchingAuthors.map((matchingAuthor) => matchingAuthor._id),
          },
        });
      }

      queryConditions.push({ $or: searchClauses });
    }

    const query = { $and: queryConditions };

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

// Get user's bookmarked poems
router.get("/bookmarks", auth, poemOperationLimit, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query; // Increased default limit to 100
    const userId = req.user.userId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query the Bookmark collection instead of user.bookmarkedPoems
    const totalBookmarks = await Bookmark.countDocuments({ user: userId });
    
    if (totalBookmarks === 0) {
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

    // Get bookmarks with populated poem details
    const bookmarks = await Bookmark.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "poem",
        populate: [
          { path: "author", select: "name email" },
          { path: "poet", select: "name bio profileImage" },
        ],
      });

    // Extract poems from bookmarks, filter out any null poems
    const poems = bookmarks
      .map(bookmark => bookmark.poem)
      .filter(poem => poem != null);

    res.json({
      success: true,
      poems: poems,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalBookmarks / parseInt(limit)),
        hasNext: skip + poems.length < totalBookmarks,
        hasPrev: parseInt(page) > 1,
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

// Get pending poems for admin review (MUST come before /:id route)
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
      .populate("author", "name email fullName")
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
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending poems",
      error: error.message,
    });
  }
});

// Get personalized recommendations (MUST come before /:id route)
router.get("/recommendations", auth, poemOperationLimit, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user?.userId;
    console.log("Recommendations endpoint called, user:", userId);

    // Validate user
    if (!req.user || !userId) {
      console.log("No user or userId found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get bookmarked poems from Bookmark collection
    const userBookmarks = await Bookmark.find({ user: userId }).select("poem").lean();
    const bookmarkedPoemIds = userBookmarks.map(b => b.poem);
    console.log("Bookmarked poems count:", bookmarkedPoemIds.length);

    // Get categories from bookmarked poems if any
    let preferredCategories = [];
    if (bookmarkedPoemIds.length > 0) {
      const bookmarkedPoemDocs = await Poem.find({
        _id: { $in: bookmarkedPoemIds }
      }).select('category').lean();
      
      preferredCategories = [...new Set(
        bookmarkedPoemDocs
          .filter(p => p && p.category)
          .map(p => p.category)
      )];
    }
    console.log("Preferred categories:", preferredCategories);

    // If no preferences, return popular poems
    if (preferredCategories.length === 0) {
      console.log("No preferences, returning popular poems");
      const popularPoems = await Poem.find({
        status: "published",
        author: { $ne: userId },
      })
        .populate("author", "name profileImage")
        .populate("poet", "name bio")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      console.log("Popular poems found:", popularPoems.length);
      return res.json({
        success: true,
        poems: popularPoems || [],
        type: "popular",
      });
    }

    // Find poems in preferred categories that user hasn't bookmarked
    const recommendations = await Poem.find({
      status: "published",
      category: { $in: preferredCategories },
      _id: { $nin: bookmarkedPoemIds },
      author: { $ne: userId },
    })
      .populate("author", "name profileImage")
      .populate("poet", "name bio")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log("Recommendations found:", recommendations.length);

    // If no personalized recommendations found, return popular poems instead
    if (recommendations.length === 0) {
      const popularPoems = await Poem.find({
        status: "published",
        author: { $ne: userId },
      })
        .populate("author", "name profileImage")
        .populate("poet", "name bio")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      return res.json({
        success: true,
        poems: popularPoems || [],
        type: "popular",
      });
    }

    res.json({
      success: true,
      poems: recommendations,
      type: "personalized",
      basedOn: preferredCategories,
    });
  } catch (error) {
    console.error("Get recommendations error:", error.message);
    console.error("Error stack:", error.stack);
    
    // Return empty poems array instead of error to prevent UI breaks
    res.status(200).json({
      success: true,
      poems: [],
      type: "fallback",
      message: "Unable to generate recommendations at this time",
    });
  }
});

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
        poem.status !== "pending");

    // If poem is not publicly accessible, check permissions
    if (!isPubliclyAccessible) {
      // Allow access if no user is logged in but poem is in pending status (for preview)
      if (poem.status === "pending" && !req.user) {
        return res.status(403).json({
          success: false,
          message:
            "This poem is pending approval and requires authentication to view",
        });
      }

      // If user is logged in, check if they have permission
      if (req.user) {
        const authorId = poem.author?._id?.toString() || poem.author?.toString();
        const isAuthor = authorId && req.user.userId === authorId;
        const isAdmin = req.user.role === "admin";
        const isModerator = req.user.role === "moderator";

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
    body("title")
      .isLength({ min: 2, max: 200 })
      .withMessage("عنوان 2 سے 200 حروف کے درمیان ہونا چاہیے / Title must be between 2 and 200 characters")
      .trim(),
    body("content")
      .isLength({ min: 10, max: 10000 })
      .withMessage("نظم کم از کم 10 حروف اور زیادہ سے زیادہ 10000 حروف کی ہونی چاہیے / Poem content must be between 10 and 10000 characters")
      .trim(),
    body("category")
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
      ])
      .withMessage("براہ کرم درست قسم منتخب کریں / Please select a valid category"),
    body("poetryLanguage")
      .optional()
      .isIn(["urdu", "punjabi", "arabic", "persian", "english"])
      .withMessage("براہ کرم درست زبان منتخب کریں / Please select a valid language"),
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

      // Check ownership and poet approval
      const isAuthor = poem.author.toString() === req.user.userId;
      const isAdmin = req.user.role === "admin";
      const isApprovedPoet =
        req.user.role === "poet" && req.user.isApproved && req.user.status === "active";
      if (!isAuthor && !isAdmin && !isApprovedPoet) {
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
    const isLiked = poem.likes.some(
      (like) => like?.user?.toString() === userId
    );

    if (isLiked) {
      // Unlike
      poem.likes = poem.likes.filter(
        (like) => like?.user?.toString() !== userId
      );
    } else {
      // Like
      poem.likes.push({ user: userId });
    }

    poem.likesCount = poem.likes.length;

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

      // Allow comments on all poems (removed published/approved check)

      const comment = {
        user: req.user.userId,
        comment: req.body.content,
        commentedAt: new Date(),
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

// Delete comment from poem
router.delete("/:id/comments/:commentId", auth, poemOperationLimit, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const poem = await Poem.findById(id);

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    const comment = poem.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is the comment author or poem author or admin
    // Convert ObjectId to string for comparison
    const commentUserId = comment.user ? comment.user.toString() : null;
    const poemAuthorId = poem.author ? poem.author.toString() : null;
    const requestUserId = req.user.userId.toString(); // Convert to string

    const isCommentAuthor = commentUserId === requestUserId;
    const isPoemAuthor = poemAuthorId === requestUserId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    console.log('Delete comment authorization check:', {
      commentUserId,
      poemAuthorId,
      requestUserId,
      userRole: req.user.role,
      isCommentAuthor,
      isPoemAuthor,
      isAdmin,
      authorized: isCommentAuthor || isPoemAuthor || isAdmin
    });

    if (!isCommentAuthor && !isPoemAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
        debug: {
          commentUserId,
          requestUserId,
          poemAuthorId
        }
      });
    }

    poem.comments.pull(commentId);
    poem.commentsCount = Math.max(0, poem.commentsCount - 1);
    await poem.save();

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message
    });
  }
});

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
    const userId = req.user.userId;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Check if bookmark exists in Bookmark collection
    const existingBookmark = await Bookmark.findOne({ user: userId, poem: id });

    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.deleteOne({ user: userId, poem: id });
      
      // Also update poem.bookmarks array for backward compatibility
      poem.bookmarks = poem.bookmarks.filter(
        (bookmark) => bookmark?.user?.toString() !== userId
      );
      await poem.save();

      // Get updated count
      const bookmarksCount = await Bookmark.countDocuments({ user: userId });

      res.json({
        success: true,
        message: "Poem removed from bookmarks",
        isBookmarked: false,
        bookmarksCount: bookmarksCount,
        poemBookmarksCount: poem.bookmarks.length,
      });
    } else {
      // Add bookmark
      await Bookmark.create({ user: userId, poem: id });
      
      // Also update poem.bookmarks array for backward compatibility
      if (!poem.bookmarks.some((bookmark) => bookmark?.user?.toString() === userId)) {
        poem.bookmarks.push({ user: userId });
        await poem.save();
      }

      // Get updated count
      const bookmarksCount = await Bookmark.countDocuments({ user: userId });

      res.json({
        success: true,
        message: "Poem bookmarked successfully",
        isBookmarked: true,
        bookmarksCount: bookmarksCount,
        poemBookmarksCount: poem.bookmarks.length,
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

    // Track reading history if user is authenticated
    if (req.user && req.user.userId) {
      try {
        await ReadingHistory.addOrUpdate(req.user.userId, req.params.id);
      } catch (historyError) {
        // Don't fail the request if history tracking fails
        console.error("Failed to track reading history:", historyError.message);
      }
    }

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
    const userId = req.user.userId;

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

    // Check if bookmark exists in Bookmark collection
    const existingBookmark = await Bookmark.findOne({ user: userId, poem: poemId });

    if (existingBookmark) {
      // Remove bookmark from Bookmark collection
      await Bookmark.deleteOne({ user: userId, poem: poemId });

      // Also update Poem's bookmarks array for backward compatibility
      await Poem.findByIdAndUpdate(poemId, {
        $pull: { bookmarks: { user: userId } }
      });

      // Get updated bookmarks count
      const bookmarksCount = await Bookmark.countDocuments({ user: userId });

      res.json({
        success: true,
        action: "removed",
        message: "شاعری پسندیدہ فہرست سے ہٹائی گئی", // Poem removed from favorites
        isBookmarked: false,
        bookmarksCount,
      });
    } else {
      // Add bookmark to Bookmark collection
      await Bookmark.create({ user: userId, poem: poemId });

      // Also update Poem's bookmarks array for backward compatibility
      await Poem.findByIdAndUpdate(poemId, {
        $addToSet: { bookmarks: { user: userId, bookmarkedAt: new Date() } }
      });

      // Get updated bookmarks count
      const bookmarksCount = await Bookmark.countDocuments({ user: userId });

      res.json({
        success: true,
        action: "added",
        message: "شاعری پسندیدہ فہرست میں شامل ہوئی", // Poem added to favorites
        isBookmarked: true,
        bookmarksCount,
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
  : "Basic recommendations", // Basic recommendations
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

// ============= AI-POWERED ANALYSIS ROUTES REMOVED =============
// All AI endpoints now return fallback responses
router.post("/:id/analyze", poemOperationLimit, async (req, res) => {
  res.json({
    success: false,
    message: "AI analysis unavailable. OpenAI API removed.",
    analysis: {},
  });
});

router.post("/:id/evaluate", auth, poemOperationLimit, async (req, res) => {
  res.json({
    success: false,
    message: "AI evaluation unavailable. OpenAI API removed.",
    evaluation: {},
  });
});

router.get("/ai/personalized", auth, poemOperationLimit, async (req, res) => {
  res.json({
    success: false,
    message: "AI personalized recommendations unavailable. OpenAI API removed.",
    recommendations: [],
  });
});

router.post("/ai/thematic-analysis", poemOperationLimit, async (req, res) => {
  res.json({
    success: false,
    message: "AI thematic analysis unavailable. OpenAI API removed.",
    analysis: {},
  });
});

router.post(
  "/ai/writing-suggestions",
  auth,
  poemOperationLimit,
  async (req, res) => {
    res.json({
      success: false,
      message: "AI writing suggestions unavailable. OpenAI API removed.",
      suggestions: {},
    });
  }
);

/**
 * @route   GET /api/poems/ai/features
 * @desc    Get available AI features and their status
 * @access  Public
 */
router.get("/ai/features", (req, res) => {
  // OpenAI AI features endpoint removed
  res.json({
    success: true,
    features: {},
    aiConfigured: false,
    message: "AI فیچرز دستیاب نہیں - OpenAI API key کی ضرورت", // AI features unavailable
  });
});

export default router;
