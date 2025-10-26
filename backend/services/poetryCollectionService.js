const Poem = require("../models/Poem");
const User = require("../models/User");
const PoetBiography = require("../models/PoetBiography");
// OpenAI service removed
const rekhtaService = require("./rekhtaService");
const mongoose = require("mongoose");

class PoetryCollectionService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 15; // 15 minutes cache
  }

  // Cache management
  getCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Create new poem with AI enhancement
  async createPoem(poemData, userId) {
    try {
      const {
        title,
        titleInEnglish,
        content,
        genre,
        theme,
        language,
        mood,
        tags,
        poetId,
        isOriginal,
        source,
        sourceUrl,
        notes,
      } = poemData;

      // Validate required fields
      if (!title || !content) {
        return {
          success: false,
          error: "Title and content are required",
        };
      }

      // Get AI analysis of the poem
      let aiAnalysis = null;
      try {
  // AI analysis removed. No tone analysis available.
        if (analysis.success) {
          aiAnalysis = {
            dominantEmotion: analysis.data.dominantEmotion,
            emotionalIntensity: analysis.data.emotionalIntensity,
            themes: analysis.data.themes,
            suggestedGenre: analysis.data.suggestedGenre,
            complexity: analysis.data.complexity,
          };
        }
      } catch (error) {
        console.warn("AI analysis failed:", error.message);
      }

      // Generate search keywords
      const searchKeywords = this.generateSearchKeywords(
        title,
        content,
        theme,
        tags
      );

      // Create poem object
      const newPoem = new Poem({
        title: title.trim(),
        titleInEnglish: titleInEnglish?.trim(),
        content: content.trim(),
        author: userId,
        poet: poetId || null,
        genre: genre || aiAnalysis?.suggestedGenre || "غزل",
        theme: theme || aiAnalysis?.themes?.[0] || "",
        language: language || "اردو",
        mood: mood || aiAnalysis?.dominantEmotion || "",
        tags: tags || [],
        searchKeywords,
        isOriginal: isOriginal !== undefined ? isOriginal : true,
        source: source || "original",
        sourceUrl: sourceUrl || "",
        notes: notes || "",
        aiAnalysis,
        status: "published",
        publishedAt: new Date(),
        metadata: {
          characterCount: content.length,
          wordCount: content.split(/\s+/).length,
          lineCount: content.split("\n").length,
          estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200), // WPM
        },
      });

      const savedPoem = await newPoem.save();

      // Populate references
      const populatedPoem = await Poem.findById(savedPoem._id)
        .populate("author", "name username profileImage")
        .populate("poet", "name nameInUrdu era importance")
        .lean();

      // Update poet statistics if applicable
      if (poetId) {
        await this.updatePoetStatistics(poetId);
      }

      return {
        success: true,
        data: populatedPoem,
        message: "Poem created successfully",
        aiInsights: aiAnalysis,
      };
    } catch (error) {
      console.error("Create poem error:", error);
      return {
        success: false,
        error: "Failed to create poem",
        details: error.message,
      };
    }
  }

  // Get poem by ID with comprehensive data
  async getPoemById(poemId, userId = null) {
    try {
      const cacheKey = this.getCacheKey("poem", { poemId, userId });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const poem = await Poem.findById(poemId)
        .populate("author", "name username profileImage role")
        .populate(
          "poet",
          "name nameInUrdu nameInEnglish era category importance images"
        )
        .lean();

      if (!poem) {
        return {
          success: false,
          error: "Poem not found",
        };
      }

      // Increment view count
      await Poem.findByIdAndUpdate(poemId, { $inc: { viewCount: 1 } });
      poem.viewCount = (poem.viewCount || 0) + 1;

      // Get user's interaction with this poem
      let userInteraction = null;
      if (userId) {
        userInteraction = await this.getUserInteraction(poemId, userId);
      }

      // Get similar poems
      const similarPoems = await this.getSimilarPoems(poemId, 5);

      // Get poem reviews/comments
      const reviews = await this.getPoemReviews(poemId, 5);

      // Generate recommendations
      let recommendations = [];
      try {
  // AI recommendations removed. No similar poetry available.
        if (recResult.success) {
          recommendations = recResult.data.similarPoems || [];
        }
      } catch (error) {
        console.warn("AI recommendations failed:", error.message);
      }

      const enrichedPoem = {
        ...poem,
        userInteraction,
        similarPoems: similarPoems.data || [],
        reviews: reviews.data || [],
        aiRecommendations: recommendations,
        readingStats: {
          estimatedTime: poem.metadata?.estimatedReadingTime || 1,
          complexity: poem.aiAnalysis?.complexity || "medium",
        },
      };

      const result = {
        success: true,
        data: enrichedPoem,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Get poem by ID error:", error);
      return {
        success: false,
        error: "Failed to get poem",
        details: error.message,
      };
    }
  }

  // Update poem
  async updatePoem(poemId, updateData, userId) {
    try {
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return {
          success: false,
          error: "Poem not found",
        };
      }

      // Check permissions
      if (poem.author.toString() !== userId) {
        const user = await User.findById(userId);
        if (!user || !["admin", "moderator"].includes(user.role)) {
          return {
            success: false,
            error: "Not authorized to update this poem",
          };
        }
      }

      // Update fields
      const allowedUpdates = [
        "title",
        "titleInEnglish",
        "content",
        "genre",
        "theme",
        "language",
        "mood",
        "tags",
        "notes",
        "poet",
      ];

      allowedUpdates.forEach((field) => {
        if (updateData[field] !== undefined) {
          poem[field] = updateData[field];
        }
      });

      // Regenerate search keywords if content changed
      if (
        updateData.content ||
        updateData.title ||
        updateData.theme ||
        updateData.tags
      ) {
        poem.searchKeywords = this.generateSearchKeywords(
          poem.title,
          poem.content,
          poem.theme,
          poem.tags
        );
      }

      // Update metadata
      if (updateData.content) {
        poem.metadata = {
          ...poem.metadata,
          characterCount: poem.content.length,
          wordCount: poem.content.split(/\s+/).length,
          lineCount: poem.content.split("\n").length,
          estimatedReadingTime: Math.ceil(
            poem.content.split(/\s+/).length / 200
          ),
        };

        // Get new AI analysis if content changed
        try {
          // AI analysis removed. No tone analysis available.
          if (analysis.success) {
            poem.aiAnalysis = {
              dominantEmotion: analysis.data.dominantEmotion,
              emotionalIntensity: analysis.data.emotionalIntensity,
              themes: analysis.data.themes,
              suggestedGenre: analysis.data.suggestedGenre,
              complexity: analysis.data.complexity,
            };
          }
        } catch (error) {
          console.warn("AI re-analysis failed:", error.message);
        }
      }

      poem.updatedAt = new Date();
      const updatedPoem = await poem.save();

      // Clear cache
      this.clearCacheForPoem(poemId);

      // Populate and return
      const populatedPoem = await Poem.findById(updatedPoem._id)
        .populate("author", "name username profileImage")
        .populate("poet", "name nameInUrdu era importance")
        .lean();

      return {
        success: true,
        data: populatedPoem,
        message: "Poem updated successfully",
      };
    } catch (error) {
      console.error("Update poem error:", error);
      return {
        success: false,
        error: "Failed to update poem",
        details: error.message,
      };
    }
  }

  // Delete poem
  async deletePoem(poemId, userId) {
    try {
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return {
          success: false,
          error: "Poem not found",
        };
      }

      // Check permissions
      if (poem.author.toString() !== userId) {
        const user = await User.findById(userId);
        if (!user || !["admin", "moderator"].includes(user.role)) {
          return {
            success: false,
            error: "Not authorized to delete this poem",
          };
        }
      }

      await Poem.findByIdAndDelete(poemId);

      // Clear cache
      this.clearCacheForPoem(poemId);

      // Update poet statistics if applicable
      if (poem.poet) {
        await this.updatePoetStatistics(poem.poet);
      }

      return {
        success: true,
        message: "Poem deleted successfully",
      };
    } catch (error) {
      console.error("Delete poem error:", error);
      return {
        success: false,
        error: "Failed to delete poem",
        details: error.message,
      };
    }
  }

  // Get poems with advanced filtering and pagination
  async getPoems(filters = {}, page = 1, limit = 20) {
    try {
      const {
        author,
        poet,
        genre,
        theme,
        language,
        mood,
        tags,
        dateRange,
        rating,
        sortBy = "recent",
        status = "published",
      } = filters;

      const cacheKey = this.getCacheKey("poems", { filters, page, limit });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      let query = { status };
      const skip = (page - 1) * limit;

      // Apply filters
      if (author) query.author = author;
      if (poet) query.poet = poet;
      if (genre) query.genre = { $regex: genre, $options: "i" };
      if (theme) query.theme = { $regex: theme, $options: "i" };
      if (language) query.language = language;
      if (mood) query.mood = { $regex: mood, $options: "i" };
      if (tags && tags.length > 0) {
        query.tags = { $in: tags.map((tag) => new RegExp(tag, "i")) };
      }
      if (rating && rating.min) {
        query.averageRating = { $gte: rating.min };
      }
      if (dateRange) {
        if (dateRange.start && dateRange.end) {
          query.publishedAt = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end),
          };
        }
      }

      // Sort options
      let sortOptions = {};
      switch (sortBy) {
        case "recent":
          sortOptions = { publishedAt: -1 };
          break;
        case "oldest":
          sortOptions = { publishedAt: 1 };
          break;
        case "popular":
          sortOptions = { viewCount: -1, likesCount: -1 };
          break;
        case "rating":
          sortOptions = { averageRating: -1, ratingsCount: -1 };
          break;
        case "title":
          sortOptions = { title: 1 };
          break;
        case "author":
          sortOptions = { "author.name": 1 };
          break;
        default:
          sortOptions = { publishedAt: -1 };
      }

      const poems = await Poem.find(query)
        .populate("author", "name username profileImage role")
        .populate("poet", "name nameInUrdu era importance images")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Poem.countDocuments(query);

      // Add excerpts and reading time
      const enrichedPoems = poems.map((poem) => ({
        ...poem,
        excerpt: this.generateExcerpt(poem.content, 200),
        readingTime: poem.metadata?.estimatedReadingTime || 1,
      }));

      const result = {
        success: true,
        data: {
          poems: enrichedPoems,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: skip + poems.length < totalCount,
            hasPrev: page > 1,
          },
        },
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Get poems error:", error);
      return {
        success: false,
        error: "Failed to get poems",
        details: error.message,
      };
    }
  }

  // Rate poem
  async ratePoem(poemId, userId, rating) {
    try {
      if (rating < 1 || rating > 5) {
        return {
          success: false,
          error: "Rating must be between 1 and 5",
        };
      }

      const poem = await Poem.findById(poemId);
      if (!poem) {
        return {
          success: false,
          error: "Poem not found",
        };
      }

      // Check if user already rated
      const existingRatingIndex = poem.ratings.findIndex(
        (r) => r.user.toString() === userId
      );

      if (existingRatingIndex !== -1) {
        // Update existing rating
        poem.ratings[existingRatingIndex].rating = rating;
        poem.ratings[existingRatingIndex].createdAt = new Date();
      } else {
        // Add new rating
        poem.ratings.push({
          user: userId,
          rating,
          createdAt: new Date(),
        });
      }

      // Recalculate average rating
      const totalRating = poem.ratings.reduce((sum, r) => sum + r.rating, 0);
      poem.averageRating = totalRating / poem.ratings.length;
      poem.ratingsCount = poem.ratings.length;

      await poem.save();

      // Clear cache
      this.clearCacheForPoem(poemId);

      return {
        success: true,
        data: {
          averageRating: poem.averageRating,
          ratingsCount: poem.ratingsCount,
          userRating: rating,
        },
        message: "Rating submitted successfully",
      };
    } catch (error) {
      console.error("Rate poem error:", error);
      return {
        success: false,
        error: "Failed to rate poem",
        details: error.message,
      };
    }
  }

  // Like/Unlike poem
  async toggleLike(poemId, userId) {
    try {
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return {
          success: false,
          error: "Poem not found",
        };
      }

      const likeIndex = poem.likes.indexOf(userId);
      let action = "";

      if (likeIndex !== -1) {
        // Unlike
        poem.likes.splice(likeIndex, 1);
        poem.likesCount = poem.likes.length;
        action = "unliked";
      } else {
        // Like
        poem.likes.push(userId);
        poem.likesCount = poem.likes.length;
        action = "liked";
      }

      await poem.save();

      // Clear cache
      this.clearCacheForPoem(poemId);

      return {
        success: true,
        data: {
          likesCount: poem.likesCount,
          isLiked: action === "liked",
        },
        message: `Poem ${action} successfully`,
      };
    } catch (error) {
      console.error("Toggle like error:", error);
      return {
        success: false,
        error: "Failed to toggle like",
        details: error.message,
      };
    }
  }

  // Add comment/review to poem
  async addComment(poemId, userId, commentText, rating = null) {
    try {
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return {
          success: false,
          error: "Poem not found",
        };
      }

      const comment = {
        user: userId,
        text: commentText.trim(),
        rating: rating,
        createdAt: new Date(),
      };

      poem.comments.push(comment);
      poem.commentsCount = poem.comments.length;

      // If rating provided, also handle rating
      if (rating) {
        await this.ratePoem(poemId, userId, rating);
      }

      await poem.save();

      // Populate the new comment
      const populatedPoem = await Poem.findById(poemId)
        .populate("comments.user", "name username profileImage")
        .lean();

      const newComment =
        populatedPoem.comments[populatedPoem.comments.length - 1];

      // Clear cache
      this.clearCacheForPoem(poemId);

      return {
        success: true,
        data: newComment,
        message: "Comment added successfully",
      };
    } catch (error) {
      console.error("Add comment error:", error);
      return {
        success: false,
        error: "Failed to add comment",
        details: error.message,
      };
    }
  }

  // Get similar poems using AI and database matching
  async getSimilarPoems(poemId, limit = 5) {
    try {
      const poem = await Poem.findById(poemId).lean();
      if (!poem) {
        return { success: false, error: "Poem not found" };
      }

      // Find similar poems by genre, theme, and poet
      const similarPoems = await Poem.find({
        _id: { $ne: poemId },
        status: "published",
        $or: [
          { genre: poem.genre },
          { theme: poem.theme },
          { poet: poem.poet },
          { mood: poem.mood },
          { tags: { $in: poem.tags } },
        ],
      })
        .populate("author", "name username profileImage")
        .populate("poet", "name nameInUrdu")
        .sort({ viewCount: -1, averageRating: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        data: similarPoems.map((p) => ({
          ...p,
          excerpt: this.generateExcerpt(p.content, 150),
        })),
      };
    } catch (error) {
      console.error("Get similar poems error:", error);
      return {
        success: false,
        error: "Failed to get similar poems",
        details: error.message,
      };
    }
  }

  // Get poem reviews/comments
  async getPoemReviews(poemId, limit = 10) {
    try {
      const poem = await Poem.findById(poemId)
        .populate("comments.user", "name username profileImage")
        .lean();

      if (!poem) {
        return { success: false, error: "Poem not found" };
      }

      const reviews = poem.comments
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      return {
        success: true,
        data: reviews,
      };
    } catch (error) {
      console.error("Get poem reviews error:", error);
      return {
        success: false,
        error: "Failed to get reviews",
        details: error.message,
      };
    }
  }

  // Get user's interaction with poem
  async getUserInteraction(poemId, userId) {
    try {
      const poem = await Poem.findById(poemId).lean();
      if (!poem) return null;

      const isLiked = poem.likes.includes(userId);
      const userRating = poem.ratings.find((r) => r.user.toString() === userId);
      const userComment = poem.comments.find(
        (c) => c.user.toString() === userId
      );

      return {
        isLiked,
        rating: userRating?.rating || null,
        comment: userComment?.text || null,
        commentDate: userComment?.createdAt || null,
      };
    } catch (error) {
      console.error("Get user interaction error:", error);
      return null;
    }
  }

  // Get trending poems
  async getTrendingPoems(timeframe = "week", limit = 10) {
    try {
      const cacheKey = this.getCacheKey("trending", { timeframe, limit });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      let dateFilter = {};
      const now = new Date();

      switch (timeframe) {
        case "day":
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 1)) };
          break;
        case "week":
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case "month":
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        default:
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
      }

      const trendingPoems = await Poem.find({
        status: "published",
        publishedAt: dateFilter,
      })
        .populate("author", "name username profileImage")
        .populate("poet", "name nameInUrdu")
        .sort({
          viewCount: -1,
          likesCount: -1,
          averageRating: -1,
        })
        .limit(limit)
        .lean();

      const result = {
        success: true,
        data: trendingPoems.map((poem) => ({
          ...poem,
          excerpt: this.generateExcerpt(poem.content, 150),
        })),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Get trending poems error:", error);
      return {
        success: false,
        error: "Failed to get trending poems",
        details: error.message,
      };
    }
  }

  // Generate search keywords for poem
  generateSearchKeywords(title, content, theme, tags = []) {
    const keywords = [
      ...title.split(" "),
      ...content.split(" ").slice(0, 20), // First 20 words
      theme,
      ...tags,
    ]
      .filter((word) => word && word.length > 2)
      .map((word) => word.toLowerCase().replace(/[^\w]/g, ""));

    return [...new Set(keywords)];
  }

  // Generate excerpt from content
  generateExcerpt(content, maxLength = 200) {
    if (content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    return lastSpace > 0
      ? truncated.substring(0, lastSpace) + "..."
      : truncated + "...";
  }

  // Update poet statistics
  async updatePoetStatistics(poetId) {
    try {
      const stats = await Poem.aggregate([
        {
          $match: {
            poet: new mongoose.Types.ObjectId(poetId),
            status: "published",
          },
        },
        {
          $group: {
            _id: null,
            totalPoems: { $sum: 1 },
            totalViews: { $sum: "$viewCount" },
            totalLikes: { $sum: "$likesCount" },
            averageRating: { $avg: "$averageRating" },
          },
        },
      ]);

      if (stats.length > 0) {
        await PoetBiography.findByIdAndUpdate(poetId, {
          "statistics.totalPoems": stats[0].totalPoems,
          "statistics.totalViews": stats[0].totalViews,
          "statistics.totalLikes": stats[0].totalLikes,
          "statistics.averageRating": stats[0].averageRating,
        });
      }
    } catch (error) {
      console.error("Update poet statistics error:", error);
    }
  }

  // Import poem from external source
  async importExternalPoem(source, poemId, userId) {
    try {
      let poemData = null;

      if (source === "rekhta") {
        const importData = await rekhtaService.importPoemToLocal(poemId);
        if (importData.success) {
          poemData = importData.data;
        }
      }

      if (!poemData) {
        return {
          success: false,
          error: "Failed to import poem from external source",
        };
      }

      // Create poem in database
      const createResult = await this.createPoem(
        {
          ...poemData,
          isOriginal: false,
        },
        userId
      );

      return createResult;
    } catch (error) {
      console.error("Import external poem error:", error);
      return {
        success: false,
        error: "Failed to import poem",
        details: error.message,
      };
    }
  }

  // Clear cache for specific poem
  clearCacheForPoem(poemId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(poemId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

module.exports = new PoetryCollectionService();
