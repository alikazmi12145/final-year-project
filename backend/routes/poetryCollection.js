import express from "express";
import PoetryCollectionController from "../controllers/poetryCollectionController.js";
import { auth } from "../middleware/auth.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Poem from "../models/Poem.js";
import Review from "../models/Review.js";
import Collection from "../models/Collection.js";

const router = express.Router();

// Configure Cloudinary storage for media uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "poetry-collection",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "mp3", "wav", "ogg"],
    resource_type: "auto",
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files
  },
});

// Middleware for handling file uploads
const uploadFields = upload.fields([
  { name: "images", maxCount: 3 },
  { name: "audio", maxCount: 1 },
]);

/**
 * Poetry Collection Routes
 * Complete CRUD operations, ratings, reviews, AI recommendations, and collections
 */

// ============= POEM CRUD ROUTES =============

/**
 * @route   POST /api/poetry
 * @desc    Create a new poem
 * @access  Private
 */
router.post("/", auth, uploadFields, PoetryCollectionController.createPoem);

/**
 * @route   GET /api/poetry
 * @desc    Get all poems with filtering and pagination
 * @access  Public
 * @params  ?page=1&limit=12&category=ghazal&mood=romantic&theme=love&author=userId&tags=tag1,tag2&search=query&sortBy=publishedAt&sortOrder=desc&featured=false
 */
router.get("/", PoetryCollectionController.getAllPoems);

/**
 * @route   GET /api/poetry/:id
 * @desc    Get single poem by ID with detailed information
 * @access  Public (view count tracked if authenticated)
 */
router.get("/:id", PoetryCollectionController.getPoemById);

/**
 * @route   PUT /api/poetry/:id
 * @desc    Update poem
 * @access  Private (author only or admin)
 */
router.put("/:id", auth, uploadFields, PoetryCollectionController.updatePoem);

/**
 * @route   DELETE /api/poetry/:id
 * @desc    Delete poem
 * @access  Private (author only or admin)
 */
router.delete("/:id", auth, PoetryCollectionController.deletePoem);

// ============= INTERACTION ROUTES =============

/**
 * @route   POST /api/poetry/:id/like
 * @desc    Toggle like on a poem
 * @access  Private
 */
router.post("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Ø´Ø§Ø¹Ø±ÛŒ Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    await poem.addLike(userId);

    res.json({
      success: true,
      message: "Ù¾Ø³Ù†Ø¯ Ú©ÛŒ Ø­Ø§Ù„Øª ØªØ¨Ø¯ÛŒÙ„ ÛÙˆØ¦ÛŒ", // "Like status changed"
      likesCount: poem.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù¾Ø³Ù†Ø¯ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poetry/:id/dislike
 * @desc    Toggle dislike on a poem
 * @access  Private
 */
router.post("/:id/dislike", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Ø´Ø§Ø¹Ø±ÛŒ Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    await poem.addDislike(userId);

    res.json({
      success: true,
      message: "Ù†Ø§Ù¾Ø³Ù†Ø¯ Ú©ÛŒ Ø­Ø§Ù„Øª ØªØ¨Ø¯ÛŒÙ„ ÛÙˆØ¦ÛŒ", // "Dislike status changed"
      dislikesCount: poem.dislikes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù†Ø§Ù¾Ø³Ù†Ø¯ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poetry/:id/bookmark
 * @desc    Toggle bookmark on a poem
 * @access  Private
 */
router.post("/:id/bookmark", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Ø´Ø§Ø¹Ø±ÛŒ Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    // Toggle bookmark
    const existingBookmark = poem.bookmarks.find(
      (b) => b.user.toString() === userId
    );

    if (existingBookmark) {
      poem.bookmarks.pull({ _id: existingBookmark._id });
    } else {
      poem.bookmarks.push({ user: userId });
    }

    await poem.save();

    res.json({
      success: true,
      message: existingBookmark ? "Ø¨Ú© Ù…Ø§Ø±Ú© ÛÙ¹Ø§ÛŒØ§ Ú¯ÛŒØ§" : "Ø¨Ú© Ù…Ø§Ø±Ú© Ø´Ø§Ù…Ù„ ÛÙˆØ§", // "Bookmark removed" : "Bookmark added"
      bookmarksCount: poem.bookmarks.length,
      isBookmarked: !existingBookmark,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ø¨Ú© Ù…Ø§Ø±Ú© Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

// ============= RATING & REVIEW ROUTES =============

/**
 * @route   POST /api/poetry/:poemId/reviews
 * @desc    Add or update review for a poem
 * @access  Private
 */
router.post("/:poemId/reviews", auth, PoetryCollectionController.addReview);

/**
 * @route   GET /api/poetry/:poemId/reviews
 * @desc    Get reviews for a poem
 * @access  Public
 * @params  ?page=1&limit=10&sortBy=helpfulnessScore (helpfulnessScore|newest|oldest|rating)
 */
router.get("/:poemId/reviews", PoetryCollectionController.getReviews);

/**
 * @route   PUT /api/poetry/reviews/:reviewId/helpful
 * @desc    Mark review as helpful or not helpful
 * @access  Private
 */
router.put("/reviews/:reviewId/helpful", auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isHelpful } = req.body;
    const userId = req.user.userId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Ø¬Ø§Ø¦Ø²Û Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº", // "Review not found"
      });
    }

    await review.markHelpful(userId, isHelpful);

    res.json({
      success: true,
      message: "Ù…Ø¯Ø¯Ú¯Ø§Ø± ÙˆÙˆÙ¹ Ø±ÛŒÚ©Ø§Ø±Úˆ ÛÙˆØ§", // "Helpful vote recorded"
      helpfulCount: review.helpfulCount,
      notHelpfulCount: review.notHelpfulCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ÙˆÙˆÙ¹ Ø¯ÛŒØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poetry/reviews/:reviewId/reply
 * @desc    Add reply to a review
 * @access  Private
 */
router.post("/reviews/:reviewId/reply", auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ø¬ÙˆØ§Ø¨ Ú©Ø§ Ù…ØªÙ† Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’", // "Reply content is required"
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Ø¬Ø§Ø¦Ø²Û Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    await review.addReply(userId, content);
    await review.populate("replies.user", "name profilePicture");

    res.json({
      success: true,
      message: "Ø¬ÙˆØ§Ø¨ Ø´Ø§Ù…Ù„ ÛÙˆØ§", // "Reply added"
      replies: review.replies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ø¬ÙˆØ§Ø¨ Ø´Ø§Ù…Ù„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poetry/reviews/:reviewId/like
 * @desc    Toggle like on a review
 * @access  Private
 */
router.post("/reviews/:reviewId/like", auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Ø¬Ø§Ø¦Ø²Û Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    await review.addLike(userId);

    res.json({
      success: true,
      message: "Ù¾Ø³Ù†Ø¯ Ú©ÛŒ Ø­Ø§Ù„Øª ØªØ¨Ø¯ÛŒÙ„ ÛÙˆØ¦ÛŒ",
      likesCount: review.likesCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù¾Ø³Ù†Ø¯ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

// ============= FAVORITES ROUTES =============

/**
 * @route   POST /api/poetry/:poemId/favorites
 * @desc    Add poem to favorites
 * @access  Private
 */
router.post(
  "/:poemId/favorites",
  auth,
  PoetryCollectionController.addToFavorites
);

/**
 * @route   DELETE /api/poetry/:poemId/favorites
 * @desc    Remove poem from favorites
 * @access  Private
 */
router.delete(
  "/:poemId/favorites",
  auth,
  PoetryCollectionController.removeFromFavorites
);

/**
 * @route   GET /api/poetry/favorites
 * @desc    Get user's favorite poems
 * @access  Private
 * @params  ?page=1&limit=12
 */
router.get("/favorites", auth, PoetryCollectionController.getFavorites);

// ============= AI POETRY ANALYSIS ROUTES =============

/**
 * @route   GET /api/poetry/:poemId/ai-analysis
 * @desc    Get AI analysis for a poem
 * @access  Public
 */
router.get("/:poemId/ai-analysis", PoetryCollectionController.getAIAnalysis);

/**
 * @route   POST /api/poetry/ai/writing-suggestions
 * @desc    Get AI writing suggestions based on theme and style
 * @access  Private
 * @body    { theme: "Ù…Ø­Ø¨Øª", style: "ghazal" }
 */
router.post(
  "/ai/writing-suggestions",
  auth,
  PoetryCollectionController.getWritingSuggestions
);

/**
 * @route   GET /api/poetry/:poemId/evaluate
 * @desc    Evaluate a poem using AI
 * @access  Public
 */
router.get("/:poemId/evaluate", PoetryCollectionController.evaluatePoem);

/**
 * @route   GET /api/poetry/ai/recommendations
 * @desc    Get AI-powered personalized recommendations
 * @access  Private
 * @params  ?limit=10
 */
router.get(
  "/ai/recommendations",
  auth,
  PoetryCollectionController.getAIRecommendations
);

// ============= REKHTA API INTEGRATION ROUTES =============

/**
 * @route   GET /api/poetry/rekhta/poets/:poet
 * @desc    Get poems by classical poet from Rekhta
 * @access  Public
 * @params  ?page=1&limit=20
 */
router.get(
  "/rekhta/poets/:poet",
  PoetryCollectionController.getRekhtaPoemsByPoet
);

/**
 * @route   POST /api/poetry/rekhta/search
 * @desc    Search poems on Rekhta
 * @access  Public
 * @body    { query: "ØºØ§Ù„Ø¨", type: "poem" }
 */
router.post("/rekhta/search", PoetryCollectionController.searchRekhtaPoems);

/**
 * @route   GET /api/poetry/rekhta/featured
 * @desc    Get featured poems from Rekhta
 * @access  Public
 */
router.get(
  "/rekhta/featured",
  PoetryCollectionController.getFeaturedRekhtaPoems
);

/**
 * @route   GET /api/poetry/rekhta/poets
 * @desc    Get list of supported classical poets
 * @access  Public
 */
router.get("/rekhta/poets", PoetryCollectionController.getSupportedPoets);

// ============= ENHANCED POEM INTERACTION ROUTES =============

/**
 * @route   POST /api/poetry/:poemId/rate
 * @desc    Rate or review a poem
 * @access  Private
 * @body    { rating: 5, review: "Ø¨ÛØªØ±ÛŒÙ† Ø´Ø§Ø¹Ø±ÛŒ" }
 */
router.post("/:poemId/rate", auth, PoetryCollectionController.ratePoem);

/**
 * @route   POST /api/poetry/:poemId/favorite
 * @desc    Toggle poem favorite status
 * @access  Private
 */
router.post(
  "/:poemId/favorite",
  auth,
  PoetryCollectionController.toggleFavorite
);

/**
 * @route   POST /api/poetry/:poemId/bookmark-toggle
 * @desc    Toggle bookmark on a poem
 * @access  Private
 */
router.post(
  "/:poemId/bookmark-toggle",
  auth,
  PoetryCollectionController.toggleBookmark
);

/**
 * @route   POST /api/poetry/:poemId/like-toggle
 * @desc    Toggle like on a poem
 * @access  Private
 */
router.post(
  "/:poemId/like-toggle",
  auth,
  PoetryCollectionController.toggleLike
);

// ============= AI RECOMMENDATIONS ROUTES =============

/**
 * @route   GET /api/poetry/recommendations
 * @desc    Get AI-powered poem recommendations
 * @access  Public (better recommendations if authenticated)
 * @params  ?limit=10&type=personalized (personalized|similar|trending|discovery)&poemId=123 (for similar type)
 */
router.get("/recommendations", PoetryCollectionController.getRecommendations);

/**
 * @route   GET /api/poetry/recommendations/personalized
 * @desc    Get personalized recommendations for authenticated user
 * @access  Private
 */
router.get("/recommendations/personalized", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10 } = req.query;

    const recommendations =
      await PoetryCollectionController.getPersonalizedRecommendations(
        userId,
        parseInt(limit)
      );

    res.json({
      success: true,
      recommendations,
      type: "personalized",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ø°Ø§ØªÛŒ ØªØ¬Ø§ÙˆÛŒØ² Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ", // "Error getting personalized recommendations"
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/poetry/:poemId/similar
 * @desc    Get poems similar to a specific poem
 * @access  Public
 */
router.get("/:poemId/similar", async (req, res) => {
  try {
    const { poemId } = req.params;
    const { limit = 10 } = req.query;

    const similarPoems = await PoetryCollectionController.getSimilarPoems(
      poemId,
      parseInt(limit)
    );

    res.json({
      success: true,
      recommendations: similarPoems,
      type: "similar",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù…Ù„ØªÛŒ Ø¬Ù„ØªÛŒ Ø´Ø§Ø¹Ø±ÛŒ Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ", // "Error getting similar poems"
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/poetry/trending
 * @desc    Get trending poems
 * @access  Public
 */
router.get("/trending", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trendingPoems = await PoetryCollectionController.getTrendingPoems(
      parseInt(limit)
    );

    res.json({
      success: true,
      recommendations: trendingPoems,
      type: "trending",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù…Ù‚Ø¨ÙˆÙ„ Ø´Ø§Ø¹Ø±ÛŒ Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ", // "Error getting trending poems"
      error: error.message,
    });
  }
});

// ============= COLLECTION MANAGEMENT ROUTES =============

/**
 * @route   POST /api/poetry/collections
 * @desc    Create a new collection
 * @access  Private
 */
router.post("/collections", auth, PoetryCollectionController.createCollection);

/**
 * @route   GET /api/poetry/collections
 * @desc    Get user's collections
 * @access  Private
 * @params  ?page=1&limit=12&type=custom (favorites|reading_list|custom|shared)
 */
router.get("/collections", auth, PoetryCollectionController.getUserCollections);

/**
 * @route   GET /api/poetry/collections/public
 * @desc    Get public collections
 * @access  Public
 */
router.get("/collections/public", async (req, res) => {
  try {
    const { page = 1, limit = 12, category, tags, search } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (tags) filters.tags = tags.split(",");

    const collections = await Collection.searchCollections(search, filters);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const paginatedCollections = collections.slice(skip, skip + limitNum);
    const totalCollections = collections.length;

    res.json({
      success: true,
      collections: paginatedCollections,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCollections / limitNum),
        totalCollections,
        hasNext: pageNum < Math.ceil(totalCollections / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ø¹ÙˆØ§Ù…ÛŒ Ù…Ø¬Ù…ÙˆØ¹Û’ Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/poetry/collections/featured
 * @desc    Get featured collections
 * @access  Public
 */
router.get("/collections/featured", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const featuredCollections = await Collection.getFeaturedCollections(
      parseInt(limit)
    );

    res.json({
      success: true,
      collections: featuredCollections,
      type: "featured",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù†Ù…Ø§ÛŒØ§Úº Ù…Ø¬Ù…ÙˆØ¹Û’ Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/poetry/collections/:id
 * @desc    Get collection by ID with poems
 * @access  Public (if public) / Private (if private and owner)
 */
router.get("/collections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const collection = await Collection.findById(id)
      .populate("user", "name profilePicture")
      .populate({
        path: "poems.poem",
        populate: {
          path: "author",
          select: "name profilePicture",
        },
      })
      .populate("collaborators.user", "name profilePicture")
      .populate("followers.user", "name profilePicture");

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Ù…Ø¬Ù…ÙˆØ¹Û Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    // Check access permissions
    const isOwner = userId && collection.user._id.toString() === userId;
    const isCollaborator =
      userId &&
      collection.collaborators.some((c) => c.user._id.toString() === userId);
    const isPublic = collection.visibility === "public";

    if (!isPublic && !isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: "Ø¢Ù¾ Ú©Ùˆ Ø§Ø³ Ù…Ø¬Ù…ÙˆØ¹Û ØªÚ© Ø±Ø³Ø§Ø¦ÛŒ Ú©ÛŒ Ø§Ø¬Ø§Ø²Øª Ù†ÛÛŒÚº", // "You don't have access to this collection"
      });
    }

    // Increment view count (async)
    if (userId && !isOwner) {
      collection.incrementView(userId).catch(console.error);
    }

    res.json({
      success: true,
      collection,
      permissions: {
        canEdit:
          isOwner ||
          (isCollaborator &&
            collection.collaborators.find(
              (c) => c.user._id.toString() === userId
            )?.role === "editor"),
        canView: true,
        isOwner,
        isFollowing: userId
          ? collection.followers.some((f) => f.user._id.toString() === userId)
          : false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ù…Ø¬Ù…ÙˆØ¹Û Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/poetry/collections/:collectionId/poems/:poemId
 * @desc    Add poem to collection
 * @access  Private (owner or editor)
 */
router.post(
  "/collections/:collectionId/poems/:poemId",
  auth,
  PoetryCollectionController.addToCollection
);

/**
 * @route   DELETE /api/poetry/collections/:collectionId/poems/:poemId
 * @desc    Remove poem from collection
 * @access  Private (owner or editor)
 */
router.delete(
  "/collections/:collectionId/poems/:poemId",
  auth,
  async (req, res) => {
    try {
      const { collectionId, poemId } = req.params;
      const userId = req.user.userId;

      const collection = await Collection.findById(collectionId);
      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Ù…Ø¬Ù…ÙˆØ¹Û Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
        });
      }

      // Check authorization
      const isOwner = collection.user.toString() === userId;
      const canEdit = collection.collaborators.some(
        (c) => c.user.toString() === userId && c.role === "editor"
      );

      if (!isOwner && !canEdit) {
        return res.status(403).json({
          success: false,
          message: "Ø¢Ù¾ Ú©Ùˆ Ø§Ø³ Ù…Ø¬Ù…ÙˆØ¹Û Ù…ÛŒÚº ØªØ¨Ø¯ÛŒÙ„ÛŒ Ú©ÛŒ Ø§Ø¬Ø§Ø²Øª Ù†ÛÛŒÚº",
        });
      }

      await collection.removePoem(poemId);

      res.json({
        success: true,
        message: "Ø´Ø§Ø¹Ø±ÛŒ Ù…Ø¬Ù…ÙˆØ¹Û Ø³Û’ ÛÙ¹Ø§Ø¦ÛŒ Ú¯Ø¦ÛŒ", // "Poem removed from collection"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Ù…Ø¬Ù…ÙˆØ¹Û Ø³Û’ ÛÙ¹Ø§ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/poetry/collections/:id/follow
 * @desc    Follow/unfollow a collection
 * @access  Private
 */
router.post("/collections/:id/follow", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Ù…Ø¬Ù…ÙˆØ¹Û Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛÛŒÚº",
      });
    }

    if (collection.visibility !== "public") {
      return res.status(403).json({
        success: false,
        message: "ØµØ±Ù Ø¹ÙˆØ§Ù…ÛŒ Ù…Ø¬Ù…ÙˆØ¹ÙˆÚº Ú©Ùˆ ÙØ§Ù„Ùˆ Ú©ÛŒØ§ Ø¬Ø§ Ø³Ú©ØªØ§ ÛÛ’", // "Only public collections can be followed"
      });
    }

    const isFollowing = collection.followers.some(
      (f) => f.user.toString() === userId
    );

    if (isFollowing) {
      await collection.removeFollower(userId);
    } else {
      await collection.addFollower(userId);
    }

    res.json({
      success: true,
      message: isFollowing ? "ÙØ§Ù„Ùˆ ÛÙ¹Ø§ÛŒØ§ Ú¯ÛŒØ§" : "ÙØ§Ù„Ùˆ Ú©ÛŒØ§ Ú¯ÛŒØ§", // "Unfollowed" : "Followed"
      isFollowing: !isFollowing,
      followerCount: collection.followerCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ÙØ§Ù„Ùˆ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ",
      error: error.message,
    });
  }
});

// ============= ANALYTICS & STATISTICS =============

/**
 * @route   GET /api/poetry/analytics/dashboard
 * @desc    Get analytics for user dashboard
 * @access  Private
 */
router.get(
  "/analytics/dashboard",
  auth,
  PoetryCollectionController.getAnalytics
);

/**
 * @route   GET /api/poetry/statistics
 * @desc    Get general platform statistics
 * @access  Public
 */
router.get("/statistics", async (req, res) => {
  try {
    const totalPoems = await Poem.countDocuments({ status: "published" });
    const totalCollections = await Collection.countDocuments({
      visibility: "public",
    });
    const totalReviews = await Review.countDocuments({ status: "active" });

    // Get popular categories
    const popularCategories = await Poem.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get top rated poems
    const topRatedPoems = await Poem.find({ status: "published" })
      .populate("author", "name profilePicture")
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(5)
      .select("title author averageRating totalRatings");

    res.json({
      success: true,
      statistics: {
        totalPoems,
        totalCollections,
        totalReviews,
        popularCategories,
        topRatedPoems,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ø´Ù…Ø§Ø±ÛŒØ§Øª Ø­Ø§ØµÙ„ Ú©Ø±ØªÛ’ ÙˆÙ‚Øª Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ", // "Error getting statistics"
      error: error.message,
    });
  }
});

// ============= SEARCH ROUTES =============

/**
 * @route   GET /api/poetry/search/advanced
 * @desc    Advanced search with multiple filters
 * @access  Public
 */
router.get("/search/advanced", async (req, res) => {
  try {
    const {
      q, // search query
      category,
      mood,
      theme,
      author,
      tags,
      minRating,
      maxRating,
      dateFrom,
      dateTo,
      language,
      sortBy = "relevance",
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let searchQuery = { status: "published", published: true };

    // Text search
    if (q) {
      searchQuery.$or = [
        { title: new RegExp(q, "i") },
        { content: new RegExp(q, "i") },
        { searchKeywords: { $in: [new RegExp(q, "i")] } },
      ];
    }

    // Filters
    if (category) searchQuery.category = category;
    if (mood) searchQuery.mood = mood;
    if (theme) searchQuery.theme = theme;
    if (author) searchQuery.author = author;
    if (language) searchQuery.poetryLanguage = language;

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(",");
      searchQuery.tags = {
        $in: tagArray.map((tag) => tag.toLowerCase().trim()),
      };
    }

    if (minRating || maxRating) {
      searchQuery.averageRating = {};
      if (minRating) searchQuery.averageRating.$gte = parseFloat(minRating);
      if (maxRating) searchQuery.averageRating.$lte = parseFloat(maxRating);
    }

    if (dateFrom || dateTo) {
      searchQuery.publishedAt = {};
      if (dateFrom) searchQuery.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.publishedAt.$lte = new Date(dateTo);
    }

    // Build sort
    let sortObj = {};
    switch (sortBy) {
      case "newest":
        sortObj = { publishedAt: -1 };
        break;
      case "oldest":
        sortObj = { publishedAt: 1 };
        break;
      case "popular":
        sortObj = { views: -1 };
        break;
      case "rating":
        sortObj = { averageRating: -1, totalRatings: -1 };
        break;
      case "alphabetical":
        sortObj = { title: 1 };
        break;
      default: // relevance
        sortObj = { views: -1, averageRating: -1 };
    }

    const poems = await Poem.find(searchQuery)
      .populate("author", "name profilePicture")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const totalResults = await Poem.countDocuments(searchQuery);

    res.json({
      success: true,
      results: poems,
      query: q,
      filters: {
        category,
        mood,
        theme,
        author,
        tags,
        minRating,
        maxRating,
        dateFrom,
        dateTo,
        language,
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalResults / limitNum),
        totalResults,
        hasNext: pageNum < Math.ceil(totalResults / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ØªÙØµÛŒÙ„ÛŒ ØªÙ„Ø§Ø´ Ù…ÛŒÚº Ø®Ø±Ø§Ø¨ÛŒ ÛÙˆØ¦ÛŒ", // "Error in advanced search"
      error: error.message,
    });
  }
});

export default router;
