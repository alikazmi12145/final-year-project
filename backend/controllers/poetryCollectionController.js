import Poem from "../models/Poem.js";
import Review from "../models/Review.js";
import Collection from "../models/Collection.js";
import User from "../models/User.js";
import Poet from "../models/poet.js";
import AIPoetryService from "../services/aiPoetryService.js";
import RekhtaService from "../services/rekhtaService.js";
import mongoose from "mongoose";

/**
 * Complete Poetry Collection Controller
 * Handles CRUD operations, ratings, AI recommendations, Rekhta integration, and favorites
 */

class PoetryCollectionController {
  // ============= POEM CRUD OPERATIONS =============

  /**
   * Create a new poem
   */
  static async createPoem(req, res) {
    try {
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
        copyright,
        customLicense,
        originalSource,
        visibility = "public",
        allowComments = true,
        allowDownload = false,
      } = req.body;

      const authorId = req.user.id;

      // Create new poem
      const newPoem = new Poem({
        title: title.trim(),
        subtitle: subtitle?.trim(),
        content: content.trim(),
        transliteration: transliteration?.trim(),
        translation: translation || {},
        author: authorId,
        category,
        subcategory,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
        mood,
        theme,
        poetryLanguage: poetryLanguage || "urdu",
        script: script || "nastaliq",
        copyright: copyright || "all_rights_reserved",
        customLicense,
        originalSource,
        status: "draft", // Default to draft
      });

      // Handle media uploads if present
      if (req.files) {
        if (req.files.images) {
          newPoem.images = req.files.images.map((img) => ({
            url: img.path,
            publicId: img.filename,
            caption: img.originalname,
          }));
        }

        if (req.files.audio) {
          newPoem.audio = {
            url: req.files.audio[0].path,
            publicId: req.files.audio[0].filename,
            recitedBy: req.body.recitedBy || "خود مصنف", // "Author themselves"
          };
        }
      }

      await newPoem.save();

      // Auto-create favorites collection for new user
      await PoetryCollectionController.ensureUserFavorites(authorId);

      // Populate author details
      await newPoem.populate("author", "name profilePicture email");

      res.status(201).json({
        success: true,
        message: "شاعری کامیابی سے بنائی گئی", // "Poem created successfully"
        poem: newPoem,
      });
    } catch (error) {
      console.error("Error creating poem:", error);
      res.status(500).json({
        success: false,
        message: "شاعری بناتے وقت خرابی ہوئی", // "Error occurred while creating poem"
        error: error.message,
      });
    }
  }

  /**
   * Get all poems with filtering and pagination
   */
  static async getAllPoems(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        mood,
        theme,
        language,
        author,
        tags,
        search,
        sortBy = "publishedAt",
        sortOrder = "desc",
        featured = false,
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = {
        status: "published",
        published: true,
      };

      // Add filters
      if (category) query.category = category;
      if (mood) query.mood = mood;
      if (theme) query.theme = theme;
      if (language) query.poetryLanguage = language;
      if (author) query.author = author;
      if (featured === "true") query.featured = true;

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(",");
        query.tags = { $in: tagArray.map((tag) => tag.toLowerCase().trim()) };
      }

      if (search) {
        query.$or = [
          { title: new RegExp(search, "i") },
          { content: new RegExp(search, "i") },
          { searchKeywords: { $in: [new RegExp(search, "i")] } },
        ];
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute query
      const poems = await Poem.find(query)
        .populate("author", "name profilePicture")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const totalPoems = await Poem.countDocuments(query);
      const totalPages = Math.ceil(totalPoems / limitNum);

      res.json({
        success: true,
        poems,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalPoems,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching poems:", error);
      res.status(500).json({
        success: false,
        message: "شاعری حاصل کرتے وقت خرابی ہوئی", // "Error occurred while fetching poems"
        error: error.message,
      });
    }
  }

  /**
   * Get single poem by ID with detailed information
   */
  static async getPoemById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID", // "Invalid poem ID"
        });
      }

      const poem = await Poem.findById(id)
        .populate("author", "name profilePicture bio")
        .populate("poet", "name biography")
        .populate("ratings.user", "name profilePicture")
        .populate("comments.user", "name profilePicture")
        .populate("comments.replies.user", "name profilePicture");

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں", // "Poem not found"
        });
      }

      // Increment view count (async, don't wait)
      if (userId && poem.author.toString() !== userId) {
        poem.incrementViews().catch(console.error);
      }

      // Check if user has liked, bookmarked, or rated
      let userEngagement = {
        hasLiked: false,
        hasBookmarked: false,
        userRating: null,
        isAuthor: false,
      };

      if (userId) {
        userEngagement = {
          hasLiked: poem.likes.some((like) => like.user.toString() === userId),
          hasBookmarked: poem.bookmarks.some(
            (bookmark) => bookmark.user.toString() === userId
          ),
          userRating:
            poem.ratings.find((rating) => rating.user._id.toString() === userId)
              ?.rating || null,
          isAuthor: poem.author._id.toString() === userId,
        };
      }

      res.json({
        success: true,
        poem,
        userEngagement,
      });
    } catch (error) {
      console.error("Error fetching poem:", error);
      res.status(500).json({
        success: false,
        message: "شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update poem
   */
  static async updatePoem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      const poem = await Poem.findById(id);

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Check authorization
      if (poem.author.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس شاعری میں تبدیلی کی اجازت نہیں", // "You don't have permission to modify this poem"
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
        "copyright",
        "customLicense",
        "originalSource",
        "allowComments",
        "allowDownload",
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          poem[field] = updateData[field];
        }
      });

      // Handle tags
      if (updateData.tags) {
        poem.tags = updateData.tags.map((tag) => tag.toLowerCase().trim());
      }

      await poem.save();

      await poem.populate("author", "name profilePicture email");

      res.json({
        success: true,
        message: "شاعری کامیابی سے اپ ڈیٹ ہوئی", // "Poem updated successfully"
        poem,
      });
    } catch (error) {
      console.error("Error updating poem:", error);
      res.status(500).json({
        success: false,
        message: "شاعری اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete poem
   */
  static async deletePoem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      const poem = await Poem.findById(id);

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Check authorization
      if (poem.author.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس شاعری کو ڈیلیٹ کرنے کی اجازت نہیں",
        });
      }

      // Delete related data
      await Review.deleteMany({ poem: id });
      await Collection.updateMany(
        { "poems.poem": id },
        { $pull: { poems: { poem: id } } }
      );

      // Delete the poem
      await Poem.findByIdAndDelete(id);

      res.json({
        success: true,
        message: "شاعری کامیابی سے ڈیلیٹ ہوئی", // "Poem deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting poem:", error);
      res.status(500).json({
        success: false,
        message: "شاعری ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= RATING & REVIEW SYSTEM =============

  /**
   * Add or update review for a poem
   */
  static async addReview(req, res) {
    try {
      const { poemId } = req.params;
      const userId = req.user.id;
      const { rating, title, content, categories } = req.body;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "ریٹنگ 1 سے 5 کے درمیان ہونی چاہیے",
        });
      }

      // Check if poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Check if user already reviewed
      let existingReview = await Review.findOne({ poem: poemId, user: userId });

      if (existingReview) {
        // Update existing review
        existingReview.rating = rating;
        existingReview.title = title.trim();
        existingReview.content = content.trim();
        if (categories) existingReview.categories = categories;

        await existingReview.save();
        await existingReview.populate("user", "name profilePicture");

        res.json({
          success: true,
          message: "جائزہ کامیابی سے اپ ڈیٹ ہوا", // "Review updated successfully"
          review: existingReview,
        });
      } else {
        // Create new review
        const newReview = new Review({
          poem: poemId,
          user: userId,
          rating,
          title: title.trim(),
          content: content.trim(),
          categories: categories || {},
        });

        await newReview.save();
        await newReview.populate("user", "name profilePicture");

        res.status(201).json({
          success: true,
          message: "جائزہ کامیابی سے شامل ہوا", // "Review added successfully"
          review: newReview,
        });
      }

      // Update poem's average rating (async)
      PoetryCollectionController.updatePoemRating(poemId).catch(console.error);
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({
        success: false,
        message: "جائزہ شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get reviews for a poem
   */
  static async getReviews(req, res) {
    try {
      const { poemId } = req.params;
      const { page = 1, limit = 10, sortBy = "helpfulnessScore" } = req.query;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sortObj = {};
      if (sortBy === "helpfulnessScore") {
        sortObj.helpfulnessScore = -1;
      } else if (sortBy === "newest") {
        sortObj.createdAt = -1;
      } else if (sortBy === "oldest") {
        sortObj.createdAt = 1;
      } else if (sortBy === "rating") {
        sortObj.rating = -1;
      }

      const reviews = await Review.find({ poem: poemId, status: "active" })
        .populate("user", "name profilePicture")
        .populate("replies.user", "name profilePicture")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const totalReviews = await Review.countDocuments({
        poem: poemId,
        status: "active",
      });

      // Get rating statistics
      const ratingStats = await Review.aggregate([
        {
          $match: {
            poem: new mongoose.Types.ObjectId(poemId),
            status: "active",
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      // Calculate rating distribution
      let distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (ratingStats[0]?.ratingDistribution) {
        ratingStats[0].ratingDistribution.forEach((rating) => {
          distribution[rating]++;
        });
      }

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
        statistics: {
          averageRating: ratingStats[0]?.averageRating || 0,
          totalReviews: ratingStats[0]?.totalReviews || 0,
          distribution,
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
   * Update poem's average rating (internal helper)
   */
  static async updatePoemRating(poemId) {
    try {
      const stats = await Review.aggregate([
        {
          $match: {
            poem: new mongoose.Types.ObjectId(poemId),
            status: "active",
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 },
          },
        },
      ]);

      const rating = stats[0]?.averageRating || 0;
      const total = stats[0]?.totalRatings || 0;

      await Poem.findByIdAndUpdate(poemId, {
        averageRating: Math.round(rating * 10) / 10, // Round to 1 decimal
        totalRatings: total,
      });
    } catch (error) {
      console.error("Error updating poem rating:", error);
    }
  }

  // ============= FAVORITES & COLLECTIONS =============

  /**
   * Add poem to favorites
   */
  static async addToFavorites(req, res) {
    try {
      const { poemId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      // Ensure poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Get or create user's favorites collection
      let favorites = await Collection.findOne({
        user: userId,
        type: "favorites",
        isSystemGenerated: true,
      });

      if (!favorites) {
        favorites = new Collection({
          name: "پسندیدہ شاعری", // "Favorite Poetry"
          user: userId,
          type: "favorites",
          isSystemGenerated: true,
          visibility: "private",
        });
        await favorites.save();
      }

      // Check if already in favorites
      const existingPoem = favorites.poems.find(
        (p) => p.poem.toString() === poemId
      );
      if (existingPoem) {
        return res.status(400).json({
          success: false,
          message: "یہ شاعری پہلے سے پسندیدہ فہرست میں موجود ہے", // "This poem is already in favorites"
        });
      }

      // Add to favorites
      await favorites.addPoem(poemId, userId);

      res.json({
        success: true,
        message: "شاعری پسندیدہ فہرست میں شامل ہوئی", // "Poem added to favorites"
      });
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(500).json({
        success: false,
        message: "پسندیدہ فہرست میں شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Remove poem from favorites
   */
  static async removeFromFavorites(req, res) {
    try {
      const { poemId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      // Get user's favorites collection
      const favorites = await Collection.findOne({
        user: userId,
        type: "favorites",
        isSystemGenerated: true,
      });

      if (!favorites) {
        return res.status(404).json({
          success: false,
          message: "پسندیدہ فہرست موجود نہیں", // "Favorites list not found"
        });
      }

      // Remove from favorites
      await favorites.removePoem(poemId);

      res.json({
        success: true,
        message: "شاعری پسندیدہ فہرست سے ہٹائی گئی", // "Poem removed from favorites"
      });
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({
        success: false,
        message: "پسندیدہ فہرست سے ہٹاتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's favorites
   */
  static async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 12 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const favorites = await Collection.findOne({
        user: userId,
        type: "favorites",
        isSystemGenerated: true,
      }).populate({
        path: "poems.poem",
        populate: {
          path: "author",
          select: "name profilePicture",
        },
        options: {
          skip: skip,
          limit: limitNum,
        },
      });

      if (!favorites) {
        return res.json({
          success: true,
          poems: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalPoems: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }

      const totalPoems = favorites.poems.length;
      const totalPages = Math.ceil(totalPoems / limitNum);

      res.json({
        success: true,
        poems: favorites.poems.map((p) => p.poem).filter(Boolean),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalPoems,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({
        success: false,
        message: "پسندیدہ فہرست حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= AI RECOMMENDATIONS =============

  /**
   * Get AI-powered poem recommendations
   */
  static async getRecommendations(req, res) {
    try {
      const userId = req.user?.id;
      const { limit = 10, type = "personalized" } = req.query;

      let recommendations = [];

      if (type === "personalized" && userId) {
        recommendations =
          await PoetryCollectionController.getPersonalizedRecommendations(
            userId,
            parseInt(limit)
          );
      } else if (type === "similar") {
        const { poemId } = req.query;
        if (poemId) {
          recommendations = await PoetryCollectionController.getSimilarPoems(
            poemId,
            parseInt(limit)
          );
        }
      } else if (type === "trending") {
        recommendations = await PoetryCollectionController.getTrendingPoems(
          parseInt(limit)
        );
      } else if (type === "discovery") {
        recommendations =
          await PoetryCollectionController.getDiscoveryRecommendations(
            userId,
            parseInt(limit)
          );
      }

      res.json({
        success: true,
        recommendations,
        type,
      });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({
        success: false,
        message: "تجاویز حاصل کرتے وقت خرابی ہوئی", // "Error occurred while getting recommendations"
        error: error.message,
      });
    }
  }

  /**
   * Get personalized recommendations based on user behavior
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      // Get user's favorite categories, moods, and themes from their interactions
      const userInteractions = await Poem.aggregate([
        {
          $match: {
            $or: [
              { "likes.user": new mongoose.Types.ObjectId(userId) },
              { "bookmarks.user": new mongoose.Types.ObjectId(userId) },
              { "ratings.user": new mongoose.Types.ObjectId(userId) },
            ],
          },
        },
        {
          $group: {
            _id: null,
            categories: { $push: "$category" },
            moods: { $push: "$mood" },
            themes: { $push: "$theme" },
            tags: { $push: "$tags" },
            avgRatingGiven: {
              $avg: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$ratings",
                      cond: {
                        $eq: [
                          "$$this.user",
                          new mongoose.Types.ObjectId(userId),
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      ]);

      if (!userInteractions[0]) {
        // New user - return popular poems
        return await Poem.find({ status: "published", published: true })
          .populate("author", "name profilePicture")
          .sort({ views: -1, averageRating: -1 })
          .limit(limit);
      }

      const preferences = userInteractions[0];

      // Get most frequent preferences
      const topCategories = PoetryCollectionController.getMostFrequent(
        preferences.categories,
        3
      );
      const topMoods = PoetryCollectionController.getMostFrequent(
        preferences.moods,
        3
      );
      const topThemes = PoetryCollectionController.getMostFrequent(
        preferences.themes,
        3
      );
      const flatTags = preferences.tags.flat();
      const topTags = PoetryCollectionController.getMostFrequent(flatTags, 5);

      // Build recommendation query
      const recommendationQuery = {
        status: "published",
        published: true,
        author: { $ne: new mongoose.Types.ObjectId(userId) }, // Exclude user's own poems
        $or: [
          { category: { $in: topCategories } },
          { mood: { $in: topMoods } },
          { theme: { $in: topThemes } },
          { tags: { $in: topTags } },
        ],
      };

      // Get poems that user hasn't interacted with
      const userInteractedPoems = await Poem.find({
        $or: [
          { "likes.user": userId },
          { "bookmarks.user": userId },
          { "ratings.user": userId },
        ],
      }).select("_id");

      const interactedIds = userInteractedPoems.map((p) => p._id);
      recommendationQuery._id = { $nin: interactedIds };

      return await Poem.find(recommendationQuery)
        .populate("author", "name profilePicture")
        .sort({ averageRating: -1, views: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Error getting personalized recommendations:", error);
      return [];
    }
  }

  /**
   * Get similar poems based on content and metadata
   */
  static async getSimilarPoems(poemId, limit = 10) {
    try {
      const basePoem = await Poem.findById(poemId);
      if (!basePoem) return [];

      // Find poems with similar attributes
      const similarQuery = {
        _id: { $ne: new mongoose.Types.ObjectId(poemId) },
        status: "published",
        published: true,
        $or: [
          { category: basePoem.category },
          { mood: basePoem.mood },
          { theme: basePoem.theme },
          { tags: { $in: basePoem.tags } },
          { author: basePoem.author },
        ],
      };

      return await Poem.find(similarQuery)
        .populate("author", "name profilePicture")
        .sort({ averageRating: -1, views: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Error getting similar poems:", error);
      return [];
    }
  }

  /**
   * Get trending poems based on recent activity
   */
  static async getTrendingPoems(limit = 10) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return await Poem.aggregate([
        {
          $match: {
            status: "published",
            published: true,
            publishedAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $addFields: {
            trendingScore: {
              $add: [
                { $multiply: ["$views", 0.3] },
                { $multiply: [{ $size: "$likes" }, 2] },
                { $multiply: [{ $size: "$bookmarks" }, 3] },
                { $multiply: [{ $size: "$ratings" }, 4] },
                { $multiply: ["$averageRating", 10] },
              ],
            },
          },
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
            pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
          },
        },
        {
          $unwind: "$author",
        },
      ]);
    } catch (error) {
      console.error("Error getting trending poems:", error);
      return [];
    }
  }

  /**
   * Get discovery recommendations for exploring new content
   */
  static async getDiscoveryRecommendations(userId, limit = 10) {
    try {
      // Get random poems from different categories the user hasn't explored much
      const pipeline = [
        {
          $match: {
            status: "published",
            published: true,
          },
        },
        { $sample: { size: limit * 3 } }, // Get more to filter from
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
            pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
          },
        },
        {
          $unwind: "$author",
        },
        { $limit: limit },
      ];

      return await Poem.aggregate(pipeline);
    } catch (error) {
      console.error("Error getting discovery recommendations:", error);
      return [];
    }
  }

  // ============= COLLECTION MANAGEMENT =============

  /**
   * Create a new collection
   */
  static async createCollection(req, res) {
    try {
      const {
        name,
        description,
        visibility = "private",
        category,
        tags,
      } = req.body;
      const userId = req.user.id;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "مجموعہ کا نام ضروری ہے", // "Collection name is required"
        });
      }

      const newCollection = new Collection({
        name: name.trim(),
        description: description?.trim(),
        user: userId,
        type: "custom",
        visibility,
        category,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
      });

      await newCollection.save();
      await newCollection.populate("user", "name profilePicture");

      res.status(201).json({
        success: true,
        message: "مجموعہ کامیابی سے بنایا گیا", // "Collection created successfully"
        collection: newCollection,
      });
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({
        success: false,
        message: "مجموعہ بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's collections
   */
  static async getUserCollections(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 12, type } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = { user: userId };
      if (type) query.type = type;

      const collections = await Collection.find(query)
        .populate({
          path: "poems.poem",
          populate: {
            path: "author",
            select: "name profilePicture",
          },
        })
        .sort({ lastModified: -1 })
        .skip(skip)
        .limit(limitNum);

      const totalCollections = await Collection.countDocuments(query);

      res.json({
        success: true,
        collections,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCollections / limitNum),
          totalCollections,
          hasNext: pageNum < Math.ceil(totalCollections / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching user collections:", error);
      res.status(500).json({
        success: false,
        message: "مجموعے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Add poem to collection
   */
  static async addToCollection(req, res) {
    try {
      const { collectionId, poemId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      if (
        !mongoose.Types.ObjectId.isValid(collectionId) ||
        !mongoose.Types.ObjectId.isValid(poemId)
      ) {
        return res.status(400).json({
          success: false,
          message: "غلط ID",
        });
      }

      const collection = await Collection.findById(collectionId);
      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "مجموعہ موجود نہیں",
        });
      }

      // Check authorization
      if (collection.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس مجموعہ میں تبدیلی کی اجازت نہیں",
        });
      }

      // Check if poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      await collection.addPoem(poemId, userId, notes);

      res.json({
        success: true,
        message: "شاعری مجموعہ میں شامل ہوئی", // "Poem added to collection"
      });
    } catch (error) {
      console.error("Error adding to collection:", error);

      if (error.message.includes("موجود ہے")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "مجموعہ میں شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= UTILITY METHODS =============

  /**
   * Ensure user has favorites collection
   */
  static async ensureUserFavorites(userId) {
    try {
      let favorites = await Collection.findOne({
        user: userId,
        type: "favorites",
        isSystemGenerated: true,
      });

      if (!favorites) {
        favorites = new Collection({
          name: "پسندیدہ شاعری",
          user: userId,
          type: "favorites",
          isSystemGenerated: true,
          visibility: "private",
        });
        await favorites.save();
      }

      return favorites;
    } catch (error) {
      console.error("Error ensuring user favorites:", error);
      return null;
    }
  }

  /**
   * Get most frequent items from array
   */
  static getMostFrequent(arr, count = 3) {
    if (!arr || arr.length === 0) return [];

    const frequency = {};
    arr.forEach((item) => {
      if (item) {
        frequency[item] = (frequency[item] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([item]) => item);
  }

  /**
   * Get analytics for dashboard
   */
  static async getAnalytics(req, res) {
    try {
      const userId = req.user.id;

      // Get user's poems analytics
      const userPoems = await Poem.find({ author: userId });
      const totalViews = userPoems.reduce((sum, poem) => sum + poem.views, 0);
      const totalLikes = userPoems.reduce(
        (sum, poem) => sum + (poem.likes?.length || 0),
        0
      );
      const averageRating =
        userPoems.reduce((sum, poem) => sum + poem.averageRating, 0) /
          userPoems.length || 0;

      // Get collections analytics
      const collections = await Collection.find({ user: userId });
      const totalCollections = collections.length;
      const totalFollowers = collections.reduce(
        (sum, collection) => sum + (collection.followers?.length || 0),
        0
      );

      // Get recent activity
      const recentReviews = await Review.find({ user: userId })
        .populate("poem", "title author")
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        analytics: {
          poems: {
            total: userPoems.length,
            published: userPoems.filter((p) => p.status === "published").length,
            totalViews,
            totalLikes,
            averageRating: Math.round(averageRating * 10) / 10,
          },
          collections: {
            total: totalCollections,
            totalFollowers,
          },
          recentActivity: {
            reviews: recentReviews,
          },
        },
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

  // ============= AI POETRY ANALYSIS =============

  /**
   * Get AI analysis for a poem
   */
  static async getAIAnalysis(req, res) {
    try {
      const { poemId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      const poem = await Poem.findById(poemId)
        .populate("poet", "name bio")
        .populate("author", "username profile.fullName");

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Get AI analysis
      const analysis = await AIPoetryService.analyzePoemContent(poem);

      if (analysis.success) {
        res.json({
          success: true,
          analysis: analysis.analysis,
          poem: {
            id: poem._id,
            title: poem.title,
            author: poem.author,
            poet: poem.poet,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "AI تجزیہ دستیاب نہیں", // "AI analysis not available"
          reason: analysis.reason,
        });
      }
    } catch (error) {
      console.error("Error getting AI analysis:", error);
      res.status(500).json({
        success: false,
        message: "AI تجزیہ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get AI writing suggestions based on theme and style
   */
  static async getWritingSuggestions(req, res) {
    try {
      const { theme, style = "ghazal" } = req.body;

      if (!theme) {
        return res.status(400).json({
          success: false,
          message: "موضوع ضروری ہے", // "Theme is required"
        });
      }

      const suggestions = await AIPoetryService.generateWritingSuggestions(
        theme,
        style
      );

      if (suggestions.success) {
        res.json({
          success: true,
          suggestions: suggestions.suggestions,
          theme,
          style,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "تجاویز دستیاب نہیں", // "Suggestions not available"
          reason: suggestions.reason,
        });
      }
    } catch (error) {
      console.error("Error getting writing suggestions:", error);
      res.status(500).json({
        success: false,
        message: "تجاویز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Evaluate a poem using AI
   */
  static async evaluatePoem(req, res) {
    try {
      const { poemId } = req.params;

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

      const evaluation = await AIPoetryService.evaluatePoem(poem);

      if (evaluation.success) {
        res.json({
          success: true,
          evaluation: evaluation.evaluation,
          poem: {
            id: poem._id,
            title: poem.title,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "تشخیص دستیاب نہیں", // "Evaluation not available"
          reason: evaluation.reason,
        });
      }
    } catch (error) {
      console.error("Error evaluating poem:", error);
      res.status(500).json({
        success: false,
        message: "تشخیص کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get AI-powered personalized recommendations
   */
  static async getAIRecommendations(req, res) {
    try {
      const userId = req.user?.id;
      const { limit = 10 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "لاگ ان کریں", // "Please login"
        });
      }

      // Get user's favorite poems for analysis
      const userInteractions = await Poem.find({
        $or: [
          { "likes.user": userId },
          { "bookmarks.user": userId },
          { "ratings.user": userId, "ratings.rating": { $gte: 4 } },
        ],
      }).limit(20);

      if (userInteractions.length === 0) {
        // New user - return trending poems
        return PoetryCollectionController.getTrendingPoems(parseInt(limit));
      }

      // Get user profile for AI recommendations
      const user = await User.findById(userId);
      const userProfile = {
        favoriteCategories: [
          ...new Set(userInteractions.map((p) => p.category)),
        ],
        favoritePoets: [
          ...new Set(userInteractions.map((p) => p.poet).filter(Boolean)),
        ],
        preferredThemes: [...new Set(userInteractions.map((p) => p.theme))],
        recentInteractions: userInteractions.slice(0, 10),
        readingHistory: userInteractions,
      };

      // Get all available poems for recommendations
      const availablePoems = await Poem.find({
        status: "published",
        published: true,
        author: { $ne: userId }, // Exclude user's own poems
      })
        .populate("author", "username profile.fullName")
        .limit(100);

      const recommendations =
        await AIPoetryService.generatePersonalizedRecommendations(
          userProfile,
          availablePoems
        );

      if (recommendations.success) {
        res.json({
          success: true,
          recommendations: recommendations.recommendations.slice(
            0,
            parseInt(limit)
          ),
          reasoning: recommendations.reasoning,
          diversityScore: recommendations.diversityScore,
          confidenceScore: recommendations.confidenceScore,
        });
      } else {
        // Fallback to algorithmic recommendations
        const fallbackRecommendations =
          await PoetryCollectionController.getPersonalizedRecommendations(
            userId,
            parseInt(limit)
          );
        res.json({
          success: true,
          recommendations: fallbackRecommendations,
          reasoning: "بنیادی الگورتھم کی بنیاد پر تجاویز", // "Recommendations based on basic algorithm"
          fallback: true,
        });
      }
    } catch (error) {
      console.error("Error getting AI recommendations:", error);
      res.status(500).json({
        success: false,
        message: "AI تجاویز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= REKHTA API INTEGRATION =============

  /**
   * Get poems by classical poet from Rekhta
   */
  static async getRekhtaPoemsByPoet(req, res) {
    try {
      const { poet } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!poet) {
        return res.status(400).json({
          success: false,
          message: "شاعر کا نام ضروری ہے", // "Poet name is required"
        });
      }

      const poetData = await RekhtaService.getPoemsByPoet(
        poet,
        parseInt(page),
        parseInt(limit)
      );

      if (poetData.success) {
        res.json({
          success: true,
          poet: poetData.poet,
          poems: poetData.poems,
          pagination: poetData.pagination,
          source: "Rekhta.org",
          fetchedAt: poetData.fetchedAt,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "شاعر کی شاعری نہیں ملی", // "Poet's poetry not found"
          error: poetData.error,
          availablePoets: poetData.availablePoets,
        });
      }
    } catch (error) {
      console.error("Error fetching Rekhta poems:", error);
      res.status(500).json({
        success: false,
        message: "ریختہ سے شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Search poems on Rekhta
   */
  static async searchRekhtaPoems(req, res) {
    try {
      const { query, type = "poem" } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "تلاش کی عبارت ضروری ہے", // "Search query is required"
        });
      }

      const searchResults = await RekhtaService.searchPoems(query, type);

      if (searchResults.success) {
        res.json({
          success: true,
          results: searchResults.results,
          query: searchResults.query,
          type: searchResults.type,
          source: "Rekhta.org",
          fetchedAt: searchResults.fetchedAt,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "کوئی نتیجہ نہیں ملا", // "No results found"
          query: searchResults.query,
          error: searchResults.error,
        });
      }
    } catch (error) {
      console.error("Error searching Rekhta:", error);
      res.status(500).json({
        success: false,
        message: "ریختہ میں تلاش کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get featured poems from Rekhta
   */
  static async getFeaturedRekhtaPoems(req, res) {
    try {
      const featuredPoems = await RekhtaService.getFeaturedPoems();

      if (featuredPoems.success) {
        res.json({
          success: true,
          poems: featuredPoems.poems,
          source: "Rekhta.org",
          fetchedAt: featuredPoems.fetchedAt,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "نمایاں شاعری حاصل نہیں ہوسکی", // "Could not get featured poetry"
        });
      }
    } catch (error) {
      console.error("Error fetching featured Rekhta poems:", error);
      res.status(500).json({
        success: false,
        message: "نمایاں شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get list of supported classical poets
   */
  static async getSupportedPoets(req, res) {
    try {
      const poets = RekhtaService.getSupportedPoets();

      res.json({
        success: true,
        poets,
        count: poets.length,
        source: "Rekhta Integration",
      });
    } catch (error) {
      console.error("Error getting supported poets:", error);
      res.status(500).json({
        success: false,
        message: "شعراء کی فہرست حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= POEM INTERACTIONS =============

  /**
   * Rate or review a poem
   */
  static async ratePoem(req, res) {
    try {
      const { poemId } = req.params;
      const { rating, review } = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "ریٹنگ 1 سے 5 کے درمیان ہونی چاہیے",
        });
      }

      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Add or update rating
      await poem.addRating(userId, rating, review || "");

      res.json({
        success: true,
        message: "ریٹنگ کامیابی سے شامل ہوئی", // "Rating added successfully"
        rating: {
          user: userId,
          rating,
          review,
          ratedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error rating poem:", error);
      res.status(500).json({
        success: false,
        message: "ریٹنگ دیتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Toggle poem favorite status
   */
  static async toggleFavorite(req, res) {
    try {
      const { poemId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعری ID",
        });
      }

      // Check if poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں",
        });
      }

      // Get or create favorites collection
      let favorites = await Collection.findOne({
        user: userId,
        type: "favorites",
        isSystemGenerated: true,
      });

      if (!favorites) {
        favorites = new Collection({
          name: "پسندیدہ شاعری",
          user: userId,
          type: "favorites",
          isSystemGenerated: true,
          visibility: "private",
        });
        await favorites.save();
      }

      // Check if already in favorites
      const existingPoem = favorites.poems.find(
        (p) => p.poem.toString() === poemId
      );

      let message, isFavorited;

      if (existingPoem) {
        // Remove from favorites
        await favorites.removePoem(poemId);
        message = "پسندیدہ فہرست سے ہٹایا گیا"; // "Removed from favorites"
        isFavorited = false;
      } else {
        // Add to favorites
        await favorites.addPoem(poemId, userId);
        message = "پسندیدہ فہرست میں شامل ہوا"; // "Added to favorites"
        isFavorited = true;
      }

      res.json({
        success: true,
        message,
        isFavorited,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({
        success: false,
        message: "پسندیدہ فہرست اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Add poem to bookmarks
   */
  static async toggleBookmark(req, res) {
    try {
      const { poemId } = req.params;
      const userId = req.user.id;

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

      // Check if already bookmarked
      const isBookmarked = poem.bookmarks.some(
        (bookmark) => bookmark.user.toString() === userId
      );

      let message, bookmarked;

      if (isBookmarked) {
        // Remove bookmark
        poem.bookmarks = poem.bookmarks.filter(
          (bookmark) => bookmark.user.toString() !== userId
        );
        message = "بک مارک ہٹایا گیا"; // "Bookmark removed"
        bookmarked = false;
      } else {
        // Add bookmark
        poem.bookmarks.push({ user: userId });
        message = "بک مارک شامل ہوا"; // "Bookmark added"
        bookmarked = true;
      }

      await poem.save();

      res.json({
        success: true,
        message,
        bookmarked,
      });
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      res.status(500).json({
        success: false,
        message: "بک مارک اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Like or unlike a poem
   */
  static async toggleLike(req, res) {
    try {
      const { poemId } = req.params;
      const userId = req.user.id;

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

      // Check if already liked
      const isLiked = poem.likes.some(
        (like) => like.user.toString() === userId
      );

      let message, liked;

      if (isLiked) {
        // Remove like
        poem.likes = poem.likes.filter(
          (like) => like.user.toString() !== userId
        );
        message = "لائک ہٹایا گیا"; // "Like removed"
        liked = false;
      } else {
        // Add like (and remove dislike if exists)
        poem.dislikes = poem.dislikes.filter(
          (dislike) => dislike.user.toString() !== userId
        );
        poem.likes.push({ user: userId });
        message = "لائک شامل ہوا"; // "Like added"
        liked = true;
      }

      await poem.save();

      res.json({
        success: true,
        message,
        liked,
        likeCount: poem.likes.length,
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({
        success: false,
        message: "لائک اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default PoetryCollectionController;
