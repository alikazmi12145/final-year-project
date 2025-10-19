import News from "../models/News.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * News Controller for Bazm-E-Sukhan Platform
 * Handles news articles, announcements, and literary updates
 */

class NewsController {
  // ============= NEWS MANAGEMENT =============

  /**
   * Get all news articles with filtering and pagination
   */
  static async getAllNews(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        featured = false,
        status = "published",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = {};

      // Only admins/moderators can see unpublished content
      if (req.user?.role === "admin" || req.user?.role === "moderator") {
        if (status && status !== "all") {
          query.status = status;
        }
      } else {
        query.status = "published";
      }

      if (category && category !== "all") {
        query.category = category;
      }

      if (featured === "true") {
        query.featured = true;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const news = await News.find(query)
        .populate("author", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

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
   * Get single news article by ID or slug
   */
  static async getNewsById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      let query;
      if (mongoose.Types.ObjectId.isValid(id)) {
        query = { _id: id };
      } else {
        query = { slug: id };
      }

      const newsArticle = await News.findOne(query)
        .populate("author", "username profile.fullName profile.avatar")
        .populate("relatedNews", "title slug excerpt thumbnail publishedAt");

      if (!newsArticle) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      // Check if user can view unpublished content
      if (newsArticle.status !== "published") {
        if (
          !userId ||
          (newsArticle.author._id.toString() !== userId &&
            !["admin", "moderator"].includes(req.user?.role))
        ) {
          return res.status(403).json({
            success: false,
            message: "اس خبر تک رسائی کی اجازت نہیں",
          });
        }
      }

      // Increment view count (if user is not the author)
      if (userId && newsArticle.author._id.toString() !== userId) {
        await News.findByIdAndUpdate(newsArticle._id, { $inc: { views: 1 } });
      }

      res.json({
        success: true,
        news: newsArticle,
      });
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({
        success: false,
        message: "خبر حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new news article (Admin/Moderator only)
   */
  static async createNews(req, res) {
    try {
      const {
        title,
        excerpt,
        content,
        category,
        tags,
        featured = false,
        priority = "normal",
        publishedAt,
        metaDescription,
        allowComments = true,
      } = req.body;

      // Validate required fields
      if (!title || !excerpt || !content || !category) {
        return res.status(400).json({
          success: false,
          message: "تمام ضروری فیلڈز کو بھریں",
        });
      }

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^\u0600-\u06FF\w\s-]/g, "") // Keep Urdu, English letters, numbers, spaces, hyphens
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim("-");

      // Check for duplicate slug
      let uniqueSlug = slug;
      let counter = 1;
      while (await News.findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      const newsArticle = new News({
        title: title.trim(),
        slug: uniqueSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        category,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
        featured,
        priority,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        metaDescription: metaDescription || excerpt.substring(0, 155),
        allowComments,
        author: req.user.id,
        status: "published",
      });

      // Handle media uploads
      if (req.files) {
        if (req.files.thumbnail) {
          newsArticle.thumbnail = {
            url: req.files.thumbnail[0].path,
            publicId: req.files.thumbnail[0].filename,
          };
        }

        if (req.files.gallery) {
          newsArticle.gallery = req.files.gallery.map((file) => ({
            url: file.path,
            publicId: file.filename,
            caption: "",
          }));
        }
      }

      await newsArticle.save();

      await newsArticle.populate("author", "username profile.fullName");

      res.status(201).json({
        success: true,
        message: "خبر کامیابی سے شائع ہوئی",
        news: newsArticle,
      });
    } catch (error) {
      console.error("Error creating news article:", error);
      res.status(500).json({
        success: false,
        message: "خبر شائع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update news article (Author/Admin/Moderator only)
   */
  static async updateNews(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const newsArticle = await News.findById(id);

      if (!newsArticle) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      // Check authorization
      if (
        newsArticle.author.toString() !== userId &&
        !["admin", "moderator"].includes(req.user.role)
      ) {
        return res.status(403).json({
          success: false,
          message: "اس خبر میں تبدیلی کی اجازت نہیں",
        });
      }

      // Update fields
      const allowedFields = [
        "title",
        "excerpt",
        "content",
        "category",
        "tags",
        "featured",
        "priority",
        "publishedAt",
        "metaDescription",
        "allowComments",
        "status",
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          if (field === "title" && updateData[field] !== newsArticle.title) {
            // Regenerate slug if title changed
            const newSlug = updateData[field]
              .toLowerCase()
              .replace(/[^\u0600-\u06FF\w\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
              .trim("-");
            newsArticle.slug = newSlug;
          }
          newsArticle[field] = updateData[field];
        }
      });

      // Handle new file uploads
      if (req.files) {
        if (req.files.thumbnail) {
          newsArticle.thumbnail = {
            url: req.files.thumbnail[0].path,
            publicId: req.files.thumbnail[0].filename,
          };
        }

        if (req.files.gallery) {
          newsArticle.gallery = req.files.gallery.map((file) => ({
            url: file.path,
            publicId: file.filename,
            caption: "",
          }));
        }
      }

      newsArticle.updatedAt = new Date();
      await newsArticle.save();

      await newsArticle.populate("author", "username profile.fullName");

      res.json({
        success: true,
        message: "خبر کامیابی سے اپ ڈیٹ ہوئی",
        news: newsArticle,
      });
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({
        success: false,
        message: "خبر اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete news article (Author/Admin only)
   */
  static async deleteNews(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const newsArticle = await News.findById(id);

      if (!newsArticle) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      // Check authorization
      if (
        newsArticle.author.toString() !== userId &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "اس خبر کو ڈیلیٹ کرنے کی اجازت نہیں",
        });
      }

      await News.findByIdAndDelete(id);

      res.json({
        success: true,
        message: "خبر کامیابی سے ڈیلیٹ ہوئی",
      });
    } catch (error) {
      console.error("Error deleting news article:", error);
      res.status(500).json({
        success: false,
        message: "خبر ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= NEWS INTERACTIONS =============

  /**
   * Like/Unlike news article
   */
  static async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const newsArticle = await News.findById(id);

      if (!newsArticle) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      const isLiked = newsArticle.likes.includes(userId);

      if (isLiked) {
        // Unlike
        newsArticle.likes.pull(userId);
      } else {
        // Like
        newsArticle.likes.push(userId);
        // Remove from dislikes if present
        newsArticle.dislikes.pull(userId);
      }

      await newsArticle.save();

      res.json({
        success: true,
        message: isLiked ? "پسند ہٹا دیا گیا" : "پسند کیا گیا",
        likes: newsArticle.likes.length,
        dislikes: newsArticle.dislikes.length,
        isLiked: !isLiked,
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({
        success: false,
        message: "پسند کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Add comment to news article
   */
  static async addComment(req, res) {
    try {
      const { id } = req.params;
      const { content, parentComment } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "تبصرہ لکھیں",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const newsArticle = await News.findById(id);

      if (!newsArticle) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      if (!newsArticle.allowComments) {
        return res.status(400).json({
          success: false,
          message: "اس خبر پر تبصرے بند ہیں",
        });
      }

      const comment = {
        user: userId,
        content: content.trim(),
        createdAt: new Date(),
      };

      if (parentComment && mongoose.Types.ObjectId.isValid(parentComment)) {
        comment.parentComment = parentComment;
      }

      newsArticle.comments.push(comment);
      await newsArticle.save();

      // Populate the new comment
      await newsArticle.populate(
        "comments.user",
        "username profile.fullName profile.avatar"
      );
      const newComment = newsArticle.comments[newsArticle.comments.length - 1];

      res.status(201).json({
        success: true,
        message: "تبصرہ شامل کر دیا گیا",
        comment: newComment,
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({
        success: false,
        message: "تبصرہ شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get comments for news article
   */
  static async getComments(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط خبر ID",
        });
      }

      const newsArticle = await News.findById(id)
        .populate("comments.user", "username profile.fullName profile.avatar")
        .select("comments allowComments");

      if (!newsArticle) {
        return res.status(404).json({
          success: false,
          message: "خبر موجود نہیں",
        });
      }

      // Sort comments by date (newest first)
      const sortedComments = newsArticle.comments.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      // Paginate comments
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedComments = sortedComments.slice(startIndex, endIndex);

      res.json({
        success: true,
        comments: paginatedComments,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(sortedComments.length / limitNum),
          totalComments: sortedComments.length,
          hasNext: endIndex < sortedComments.length,
          hasPrev: pageNum > 1,
        },
        allowComments: newsArticle.allowComments,
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({
        success: false,
        message: "تبصرے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= FEATURED & TRENDING =============

  /**
   * Get featured news articles
   */
  static async getFeaturedNews(req, res) {
    try {
      const { limit = 6 } = req.query;

      const featuredNews = await News.find({
        featured: true,
        status: "published",
      })
        .populate("author", "username profile.fullName")
        .sort({ publishedAt: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        news: featuredNews,
      });
    } catch (error) {
      console.error("Error fetching featured news:", error);
      res.status(500).json({
        success: false,
        message: "نمایاں خبریں حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get trending news based on views and engagement
   */
  static async getTrendingNews(req, res) {
    try {
      const { limit = 6, days = 7 } = req.query;

      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(days));

      const trendingNews = await News.find({
        status: "published",
        publishedAt: { $gte: dateLimit },
      })
        .populate("author", "username profile.fullName")
        .sort({
          views: -1,
          "likes.length": -1,
          "comments.length": -1,
        })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        news: trendingNews,
      });
    } catch (error) {
      console.error("Error fetching trending news:", error);
      res.status(500).json({
        success: false,
        message: "مقبول خبریں حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get news by category
   */
  static async getNewsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 12 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const news = await News.find({
        category,
        status: "published",
      })
        .populate("author", "username profile.fullName")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalNews = await News.countDocuments({
        category,
        status: "published",
      });

      res.json({
        success: true,
        news,
        category,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalNews / limitNum),
          totalNews,
          hasNext: pageNum < Math.ceil(totalNews / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching news by category:", error);
      res.status(500).json({
        success: false,
        message: "زمرہ کی خبریں حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= STATISTICS =============

  /**
   * Get news statistics (Admin only)
   */
  static async getNewsStatistics(req, res) {
    try {
      const [
        totalNews,
        publishedNews,
        draftNews,
        featuredNews,
        categoryStats,
        popularNews,
      ] = await Promise.all([
        News.countDocuments(),
        News.countDocuments({ status: "published" }),
        News.countDocuments({ status: "draft" }),
        News.countDocuments({ featured: true, status: "published" }),
        News.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        News.find({ status: "published" })
          .select("title views likes comments")
          .sort({ views: -1 })
          .limit(5)
          .lean(),
      ]);

      const statistics = {
        overview: {
          totalNews,
          publishedNews,
          draftNews,
          featuredNews,
        },
        categoryDistribution: categoryStats,
        mostPopular: popularNews.map((news) => ({
          title: news.title,
          views: news.views,
          likes: news.likes.length,
          comments: news.comments.length,
        })),
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching news statistics:", error);
      res.status(500).json({
        success: false,
        message: "خبروں کے اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default NewsController;
