import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Collection from "../models/Collection.js";
import Review from "../models/Review.js";
import Contest from "../models/Contest.js";
import News from "../models/News.js";
import mongoose from "mongoose";

/**
 * Poet Controller for Bazm-E-Sukhan Platform
 * Handles poet-specific operations including profile management, poem submission, and analytics
 */

class PoetController {
  // ============= POET PROFILE MANAGEMENT =============

  /**
   * Get poet profile and statistics
   */
  static async getPoetProfile(req, res) {
    try {
      const poetId = req.user.id;

      const poet = await User.findById(poetId).select("-password");

      if (!poet) {
        return res.status(404).json({
          success: false,
          message: "شاعر کی پروفائل موجود نہیں",
        });
      }

      // Get poet statistics
      const [
        totalPoems,
        publishedPoems,
        draftPoems,
        pendingPoems,
        totalViews,
        totalLikes,
        totalRatings,
        averageRating,
        totalCollections,
        totalFollowers,
      ] = await Promise.all([
        Poem.countDocuments({ author: poetId }),
        Poem.countDocuments({ author: poetId, status: "published" }),
        Poem.countDocuments({ author: poetId, status: "draft" }),
        Poem.countDocuments({ author: poetId, status: "pending" }),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(poetId) } },
          { $group: { _id: null, totalViews: { $sum: "$views" } } },
        ]),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(poetId) } },
          { $project: { likesCount: { $size: "$likes" } } },
          { $group: { _id: null, totalLikes: { $sum: "$likesCount" } } },
        ]),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(poetId) } },
          { $project: { ratingsCount: { $size: "$ratings" } } },
          { $group: { _id: null, totalRatings: { $sum: "$ratingsCount" } } },
        ]),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(poetId) } },
          { $group: { _id: null, avgRating: { $avg: "$averageRating" } } },
        ]),
        Collection.countDocuments({ user: poetId }),
        User.countDocuments({ "following.user": poetId }),
      ]);

      const statistics = {
        poems: {
          total: totalPoems,
          published: publishedPoems,
          draft: draftPoems,
          pending: pendingPoems,
        },
        engagement: {
          totalViews: totalViews[0]?.totalViews || 0,
          totalLikes: totalLikes[0]?.totalLikes || 0,
          totalRatings: totalRatings[0]?.totalRatings || 0,
          averageRating:
            Math.round((averageRating[0]?.avgRating || 0) * 10) / 10,
        },
        social: {
          totalCollections,
          totalFollowers,
        },
      };

      res.json({
        success: true,
        poet,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching poet profile:", error);
      res.status(500).json({
        success: false,
        message: "شاعر کی پروفائل حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update poet profile
   */
  static async updatePoetProfile(req, res) {
    try {
      const poetId = req.user.id;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated
      delete updateData.password;
      delete updateData.role;
      delete updateData.email;

      const poet = await User.findByIdAndUpdate(
        poetId,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      ).select("-password");

      if (!poet) {
        return res.status(404).json({
          success: false,
          message: "شاعر موجود نہیں",
        });
      }

      res.json({
        success: true,
        message: "پروفائل کامیابی سے اپ ڈیٹ ہوئی",
        poet,
      });
    } catch (error) {
      console.error("Error updating poet profile:", error);
      res.status(500).json({
        success: false,
        message: "پروفائل اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= POEM MANAGEMENT =============

  /**
   * Get all poems by the poet
   */
  static async getMyPoems(req, res) {
    try {
      const poetId = req.user.id;
      const {
        page = 1,
        limit = 12,
        status,
        category,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = { author: poetId };

      if (status && status !== "all") {
        query.status = status;
      }

      if (category && category !== "all") {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ];
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const poems = await Poem.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalPoems = await Poem.countDocuments(query);

      res.json({
        success: true,
        poems,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalPoems / limitNum),
          totalPoems,
          hasNext: pageNum < Math.ceil(totalPoems / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching poet poems:", error);
      res.status(500).json({
        success: false,
        message: "شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Submit poem for publication
   */
  static async submitPoem(req, res) {
    try {
      const poetId = req.user.id;

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
        allowComments = true,
        allowDownload = false,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "شاعری کا عنوان اور مواد ضروری ہے",
        });
      }

      const poem = new Poem({
        title: title.trim(),
        subtitle: subtitle?.trim(),
        content: content.trim(),
        transliteration: transliteration?.trim(),
        translation: translation || {},
        author: poetId,
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
        status: "pending", // Submit for review
        allowComments,
        allowDownload,
      });

      // Handle media uploads if present
      if (req.files) {
        if (req.files.images) {
          poem.images = req.files.images.map((img) => ({
            url: img.path,
            publicId: img.filename,
            caption: img.originalname,
          }));
        }

        if (req.files.audio) {
          poem.audio = {
            url: req.files.audio[0].path,
            publicId: req.files.audio[0].filename,
            recitedBy: req.body.recitedBy || "خود مصنف",
          };
        }
      }

      await poem.save();

      res.status(201).json({
        success: true,
        message: "شاعری جمع کر دی گئی، منظوری کا انتظار کریں",
        poem,
      });
    } catch (error) {
      console.error("Error submitting poem:", error);
      res.status(500).json({
        success: false,
        message: "شاعری جمع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get poem submission guidelines
   */
  static async getSubmissionGuidelines(req, res) {
    try {
      const guidelines = {
        general: [
          "تمام شاعری اصل اور منفرد ہونی چاہیے",
          "غیر مہذب یا نامناسب مواد کی اجازت نہیں",
          "کاپی رائٹ کا احترام کریں",
          "مناسب کیٹگری کا انتخاب کریں",
        ],
        formatting: [
          "عنوان واضح اور مختصر ہو",
          "شاعری میں درست املا کا استعمال کریں",
          "مناسب ٹیگز شامل کریں",
          "اگر ممکن ہو تو انگریزی ترجمہ فراہم کریں",
        ],
        categories: [
          "غزل",
          "نظم",
          "قطعہ",
          "رباعی",
          "مرثیہ",
          "حمد",
          "نعت",
          "منقبت",
          "قوالی",
          "گیت",
        ],
        moods: [
          "رومانوی",
          "غمگین",
          "خوشی",
          "روحانی",
          "احتجاجی",
          "فلسفیانہ",
          "حب الوطنی",
          "اصلاحی",
        ],
        review_process: [
          "ہر شاعری کو ماہر جانچیں گے",
          "24-48 گھنٹے میں جواب ملے گا",
          "اگر مسائل ہوں تو تجاویز ملیں گی",
          "منظور شدہ شاعری فوری طور پر شائع ہوگی",
        ],
      };

      res.json({
        success: true,
        guidelines,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching guidelines:", error);
      res.status(500).json({
        success: false,
        message: "رہنمائی حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= COLLECTIONS MANAGEMENT =============

  /**
   * Get poet's collections
   */
  static async getMyCollections(req, res) {
    try {
      const poetId = req.user.id;
      const { page = 1, limit = 12 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const collections = await Collection.find({ user: poetId })
        .populate({
          path: "poems.poem",
          select: "title content averageRating views",
        })
        .sort({ lastModified: -1 })
        .skip(skip)
        .limit(limitNum);

      const totalCollections = await Collection.countDocuments({
        user: poetId,
      });

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
      console.error("Error fetching poet collections:", error);
      res.status(500).json({
        success: false,
        message: "مجموعے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new collection
   */
  static async createCollection(req, res) {
    try {
      const poetId = req.user.id;
      const {
        name,
        description,
        visibility = "public",
        category,
        tags,
      } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "مجموعہ کا نام ضروری ہے",
        });
      }

      const collection = new Collection({
        name: name.trim(),
        description: description?.trim(),
        user: poetId,
        type: "custom",
        visibility,
        category,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
      });

      await collection.save();

      res.status(201).json({
        success: true,
        message: "مجموعہ کامیابی سے بنایا گیا",
        collection,
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

  // ============= ANALYTICS & INSIGHTS =============

  /**
   * Get detailed analytics for poet
   */
  static async getAnalytics(req, res) {
    try {
      const poetId = req.user.id;
      const { timeframe = "30d" } = req.query;

      let startDate = new Date();
      switch (timeframe) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get poem performance analytics
      const poemAnalytics = await Poem.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(poetId) } },
        {
          $group: {
            _id: null,
            totalPoems: { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: { $size: "$likes" } },
            totalRatings: { $sum: { $size: "$ratings" } },
            averageRating: { $avg: "$averageRating" },
            topCategories: { $push: "$category" },
          },
        },
      ]);

      // Get recent poem performance
      const recentPoems = await Poem.find({
        author: poetId,
        publishedAt: { $gte: startDate },
      })
        .select("title views likes ratings averageRating publishedAt")
        .sort({ publishedAt: -1 })
        .limit(10);

      // Get category distribution
      const categoryStats = await Poem.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(poetId) } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get engagement trends
      const engagementTrends = await Poem.aggregate([
        {
          $match: {
            author: new mongoose.Types.ObjectId(poetId),
            publishedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$publishedAt" },
              month: { $month: "$publishedAt" },
              day: { $dayOfMonth: "$publishedAt" },
            },
            views: { $sum: "$views" },
            likes: { $sum: { $size: "$likes" } },
            poems: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);

      const analytics = {
        overview: poemAnalytics[0] || {
          totalPoems: 0,
          totalViews: 0,
          totalLikes: 0,
          totalRatings: 0,
          averageRating: 0,
        },
        recentPoems,
        categoryDistribution: categoryStats,
        engagementTrends,
        timeframe,
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      console.error("Error fetching poet analytics:", error);
      res.status(500).json({
        success: false,
        message: "تجزیات حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get engagement metrics
   */
  static async getEngagementMetrics(req, res) {
    try {
      const poetId = req.user.id;

      // Get top performing poems
      const topPoems = await Poem.find({ author: poetId })
        .sort({ views: -1, averageRating: -1 })
        .limit(10)
        .select("title views likes ratings averageRating publishedAt");

      // Get recent reviews on poet's work
      const recentReviews = await Review.find({
        poem: { $in: await Poem.find({ author: poetId }).select("_id") },
      })
        .populate("user", "username profile.fullName")
        .populate("poem", "title")
        .sort({ createdAt: -1 })
        .limit(10);

      // Get follower growth (if implemented)
      const followerStats = await User.aggregate([
        { $match: { "following.user": new mongoose.Types.ObjectId(poetId) } },
        { $count: "totalFollowers" },
      ]);

      const metrics = {
        topPoems,
        recentReviews,
        totalFollowers: followerStats[0]?.totalFollowers || 0,
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        metrics,
      });
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
      res.status(500).json({
        success: false,
        message: "انگیجمنٹ میٹرکس حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= CONTESTS & COMPETITIONS =============

  /**
   * Get available contests for poet
   */
  static async getAvailableContests(req, res) {
    try {
      const { page = 1, limit = 10, status = "active" } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {};

      if (status === "active") {
        query = {
          status: "active",
          submissionStartDate: { $lte: new Date() },
          submissionEndDate: { $gte: new Date() },
        };
      } else if (status === "upcoming") {
        query = {
          status: "active",
          submissionStartDate: { $gt: new Date() },
        };
      } else if (status === "ended") {
        query = {
          submissionEndDate: { $lt: new Date() },
        };
      }

      const contests = await Contest.find(query)
        .sort({ submissionEndDate: 1 })
        .skip(skip)
        .limit(limitNum);

      const totalContests = await Contest.countDocuments(query);

      res.json({
        success: true,
        contests,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalContests / limitNum),
          totalContests,
          hasNext: pageNum < Math.ceil(totalContests / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({
        success: false,
        message: "مقابلے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Submit poem to contest
   */
  static async submitToContest(req, res) {
    try {
      const poetId = req.user.id;
      const { contestId, poemId, additionalNotes } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(contestId) ||
        !mongoose.Types.ObjectId.isValid(poemId)
      ) {
        return res.status(400).json({
          success: false,
          message: "غلط ID",
        });
      }

      // Check if contest exists and is active
      const contest = await Contest.findById(contestId);
      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      if (
        contest.status !== "active" ||
        new Date() > contest.submissionEndDate
      ) {
        return res.status(400).json({
          success: false,
          message: "مقابلے کی آخری تاریخ گزر گئی",
        });
      }

      // Check if poem exists and belongs to poet
      const poem = await Poem.findOne({ _id: poemId, author: poetId });
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں یا آپ کی نہیں",
        });
      }

      // Check if already submitted
      const existingSubmission = contest.submissions.find(
        (sub) => sub.participant.toString() === poetId
      );

      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: "آپ نے پہلے سے اس مقابلے میں حصہ لیا ہے",
        });
      }

      // Add submission
      contest.submissions.push({
        participant: poetId,
        poem: poemId,
        submittedAt: new Date(),
        additionalNotes: additionalNotes || "",
      });

      await contest.save();

      res.json({
        success: true,
        message: "مقابلے میں کامیابی سے حصہ لیا",
        submission: {
          contest: contest.title,
          poem: poem.title,
          submittedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error submitting to contest:", error);
      res.status(500).json({
        success: false,
        message: "مقابلے میں حصہ لیتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= NOTIFICATIONS & UPDATES =============

  /**
   * Get poet notifications
   */
  static async getNotifications(req, res) {
    try {
      const poetId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      // This would typically come from a notifications model
      // For now, we'll aggregate from various sources

      const notifications = [];

      // Get recent reviews on poet's poems
      const recentReviews = await Review.find({
        poem: { $in: await Poem.find({ author: poetId }).select("_id") },
      })
        .populate("user", "username profile.fullName")
        .populate("poem", "title")
        .sort({ createdAt: -1 })
        .limit(10);

      recentReviews.forEach((review) => {
        notifications.push({
          type: "review",
          title: "نیا جائزہ",
          message: `${review.user.username} نے آپ کی شاعری "${review.poem.title}" کا جائزہ لکھا`,
          createdAt: review.createdAt,
          read: false,
          data: review,
        });
      });

      // Get contest notifications
      const activeContests = await Contest.find({
        status: "active",
        submissionStartDate: { $lte: new Date() },
        submissionEndDate: { $gte: new Date() },
      }).limit(5);

      activeContests.forEach((contest) => {
        notifications.push({
          type: "contest",
          title: "نیا مقابلہ",
          message: `"${contest.title}" مقابلے میں حصہ لیں`,
          createdAt: contest.createdAt,
          read: false,
          data: contest,
        });
      });

      // Sort by date
      notifications.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const paginatedNotifications = notifications.slice(startIndex, endIndex);

      res.json({
        success: true,
        notifications: paginatedNotifications,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(notifications.length / limitNum),
          totalNotifications: notifications.length,
          hasNext: endIndex < notifications.length,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        success: false,
        message: "اطلاعات حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get poet dashboard summary
   */
  static async getDashboardSummary(req, res) {
    try {
      const poetId = req.user.id;

      // Get quick stats
      const [
        totalPoems,
        publishedPoems,
        pendingPoems,
        totalViews,
        recentReviews,
        activeContests,
      ] = await Promise.all([
        Poem.countDocuments({ author: poetId }),
        Poem.countDocuments({ author: poetId, status: "published" }),
        Poem.countDocuments({ author: poetId, status: "pending" }),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(poetId) } },
          { $group: { _id: null, totalViews: { $sum: "$views" } } },
        ]),
        Review.find({
          poem: { $in: await Poem.find({ author: poetId }).select("_id") },
        })
          .populate("user", "username")
          .populate("poem", "title")
          .sort({ createdAt: -1 })
          .limit(5),
        Contest.countDocuments({
          status: "active",
          submissionStartDate: { $lte: new Date() },
          submissionEndDate: { $gte: new Date() },
        }),
      ]);

      const summary = {
        quickStats: {
          totalPoems,
          publishedPoems,
          pendingPoems,
          totalViews: totalViews[0]?.totalViews || 0,
          activeContests,
        },
        recentActivity: {
          reviews: recentReviews,
        },
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({
        success: false,
        message: "ڈیش بورڈ کی خلاصہ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default PoetController;
