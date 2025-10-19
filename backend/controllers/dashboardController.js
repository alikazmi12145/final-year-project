import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Review from "../models/Review.js";
import Collection from "../models/Collection.js";
import Contest from "../models/Contest.js";
import SupportTicket from "../models/SupportTicket.js";
import News from "../models/News.js";
import mongoose from "mongoose";

/**
 * Dashboard Controller for Bazm-E-Sukhan Platform
 * Handles dashboard operations for different user roles (admin, poet, moderator, reader)
 */

class DashboardController {
  // ============= COMMON DASHBOARD FUNCTIONS =============

  /**
   * Get user dashboard based on role
   */
  static async getUserDashboard(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      let dashboardData = {};

      switch (userRole) {
        case "admin":
          dashboardData = await DashboardController.getAdminDashboard(userId);
          break;
        case "poet":
          dashboardData = await DashboardController.getPoetDashboard(userId);
          break;
        case "moderator":
          dashboardData = await DashboardController.getModeratorDashboard(
            userId
          );
          break;
        case "reader":
        default:
          dashboardData = await DashboardController.getReaderDashboard(userId);
          break;
      }

      res.json({
        success: true,
        role: userRole,
        dashboard: dashboardData,
        generatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error fetching user dashboard:", error);
      res.status(500).json({
        success: false,
        message: "ڈیش بورڈ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= ADMIN DASHBOARD =============

  /**
   * Get admin dashboard data
   */
  static async getAdminDashboard(userId) {
    try {
      const [
        totalUsers,
        totalPoems,
        totalReviews,
        totalContests,
        totalTickets,
        newUsersToday,
        newPoemsToday,
        pendingPoems,
        openTickets,
        recentActivity,
      ] = await Promise.all([
        User.countDocuments(),
        Poem.countDocuments(),
        Review.countDocuments(),
        Contest.countDocuments(),
        SupportTicket.countDocuments(),
        User.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
        Poem.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
        Poem.countDocuments({ status: "pending" }),
        SupportTicket.countDocuments({ status: "open" }),
        DashboardController.getRecentActivity(),
      ]);

      // Get user role distribution
      const userRoleStats = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]);

      // Get poem status distribution
      const poemStatusStats = await Poem.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Get monthly growth data
      const monthlyGrowth = await DashboardController.getMonthlyGrowth();

      return {
        overview: {
          totalUsers,
          totalPoems,
          totalReviews,
          totalContests,
          totalTickets,
          newUsersToday,
          newPoemsToday,
          pendingPoems,
          openTickets,
        },
        distributions: {
          userRoles: userRoleStats,
          poemStatus: poemStatusStats,
        },
        monthlyGrowth,
        recentActivity,
        alerts: await DashboardController.getAdminAlerts(),
      };
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      throw error;
    }
  }

  /**
   * Get admin alerts
   */
  static async getAdminAlerts() {
    try {
      const alerts = [];

      // Check for pending poems
      const pendingPoems = await Poem.countDocuments({ status: "pending" });
      if (pendingPoems > 0) {
        alerts.push({
          type: "warning",
          title: "منظوری کا انتظار",
          message: `${pendingPoems} شاعری منظوری کا انتظار کر رہی ہے`,
          count: pendingPoems,
          action: "/admin/poems?status=pending",
        });
      }

      // Check for open support tickets
      const openTickets = await SupportTicket.countDocuments({
        status: "open",
      });
      if (openTickets > 0) {
        alerts.push({
          type: "info",
          title: "کھلے ٹکٹس",
          message: `${openTickets} سپورٹ ٹکٹس کا جواب باقی ہے`,
          count: openTickets,
          action: "/admin/support?status=open",
        });
      }

      // Check for high priority tickets
      const urgentTickets = await SupportTicket.countDocuments({
        status: "open",
        priority: "high",
      });
      if (urgentTickets > 0) {
        alerts.push({
          type: "error",
          title: "فوری ٹکٹس",
          message: `${urgentTickets} فوری ٹکٹس کی فوری توجہ درکار`,
          count: urgentTickets,
          action: "/admin/support?status=open&priority=high",
        });
      }

      return alerts;
    } catch (error) {
      console.error("Error fetching admin alerts:", error);
      return [];
    }
  }

  // ============= POET DASHBOARD =============

  /**
   * Get poet dashboard data
   */
  static async getPoetDashboard(userId) {
    try {
      const [
        totalPoems,
        publishedPoems,
        draftPoems,
        pendingPoems,
        totalViews,
        totalLikes,
        totalRatings,
        averageRating,
        recentReviews,
        contestParticipations,
        monthlyStats,
      ] = await Promise.all([
        Poem.countDocuments({ author: userId }),
        Poem.countDocuments({ author: userId, status: "published" }),
        Poem.countDocuments({ author: userId, status: "draft" }),
        Poem.countDocuments({ author: userId, status: "pending" }),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: null, totalViews: { $sum: "$views" } } },
        ]),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(userId) } },
          { $project: { likesCount: { $size: "$likes" } } },
          { $group: { _id: null, totalLikes: { $sum: "$likesCount" } } },
        ]),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(userId) } },
          { $project: { ratingsCount: { $size: "$ratings" } } },
          { $group: { _id: null, totalRatings: { $sum: "$ratingsCount" } } },
        ]),
        Poem.aggregate([
          { $match: { author: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: null, avgRating: { $avg: "$averageRating" } } },
        ]),
        Review.find({
          poem: { $in: await Poem.find({ author: userId }).select("_id") },
        })
          .populate("user", "username profile.fullName")
          .populate("poem", "title")
          .sort({ createdAt: -1 })
          .limit(5),
        Contest.find({ "submissions.participant": userId })
          .select("title submissionEndDate status")
          .sort({ createdAt: -1 })
          .limit(5),
        DashboardController.getPoetMonthlyStats(userId),
      ]);

      // Get top performing poems
      const topPoems = await Poem.find({ author: userId })
        .sort({ views: -1, averageRating: -1 })
        .limit(5)
        .select("title views likes ratings averageRating publishedAt");

      // Get available contests
      const availableContests = await Contest.find({
        status: "active",
        submissionStartDate: { $lte: new Date() },
        submissionEndDate: { $gte: new Date() },
      })
        .select("title submissionEndDate category")
        .limit(3);

      return {
        overview: {
          totalPoems,
          publishedPoems,
          draftPoems,
          pendingPoems,
          totalViews: totalViews[0]?.totalViews || 0,
          totalLikes: totalLikes[0]?.totalLikes || 0,
          totalRatings: totalRatings[0]?.totalRatings || 0,
          averageRating:
            Math.round((averageRating[0]?.avgRating || 0) * 10) / 10,
        },
        topPoems,
        recentReviews,
        contestParticipations,
        availableContests,
        monthlyStats,
        notifications: await DashboardController.getPoetNotifications(userId),
      };
    } catch (error) {
      console.error("Error fetching poet dashboard:", error);
      throw error;
    }
  }

  /**
   * Get poet monthly statistics
   */
  static async getPoetMonthlyStats(userId) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyStats = await Poem.aggregate([
        {
          $match: {
            author: new mongoose.Types.ObjectId(userId),
            publishedAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$publishedAt" },
              month: { $month: "$publishedAt" },
            },
            poems: { $sum: 1 },
            views: { $sum: "$views" },
            likes: { $sum: { $size: "$likes" } },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      return monthlyStats;
    } catch (error) {
      console.error("Error fetching poet monthly stats:", error);
      return [];
    }
  }

  /**
   * Get poet notifications
   */
  static async getPoetNotifications(userId) {
    try {
      const notifications = [];

      // Recent reviews on poet's work
      const recentReviews = await Review.find({
        poem: { $in: await Poem.find({ author: userId }).select("_id") },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .populate("user", "username")
        .populate("poem", "title")
        .limit(5);

      recentReviews.forEach((review) => {
        notifications.push({
          type: "review",
          title: "نیا جائزہ",
          message: `${review.user.username} نے "${review.poem.title}" کا جائزہ لکھا`,
          createdAt: review.createdAt,
        });
      });

      // Contest deadlines
      const upcomingDeadlines = await Contest.find({
        status: "active",
        submissionEndDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Next 3 days
        },
      }).select("title submissionEndDate");

      upcomingDeadlines.forEach((contest) => {
        const daysLeft = Math.ceil(
          (contest.submissionEndDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        notifications.push({
          type: "contest",
          title: "مقابلے کی آخری تاریخ",
          message: `"${contest.title}" مقابلے کی آخری تاریخ ${daysLeft} دن باقی`,
          createdAt: new Date(),
        });
      });

      return notifications.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } catch (error) {
      console.error("Error fetching poet notifications:", error);
      return [];
    }
  }

  // ============= MODERATOR DASHBOARD =============

  /**
   * Get moderator dashboard data
   */
  static async getModeratorDashboard(userId) {
    try {
      const [
        pendingPoems,
        pendingReviews,
        reportedContent,
        moderatedToday,
        recentSubmissions,
      ] = await Promise.all([
        Poem.countDocuments({ status: "pending" }),
        Review.countDocuments({ status: "pending" }),
        // Assuming we have a reports collection or flagged content
        0, // Placeholder for reported content count
        Poem.countDocuments({
          moderatedBy: userId,
          moderatedAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
        Poem.find({ status: "pending" })
          .populate("author", "username profile.fullName")
          .sort({ createdAt: 1 })
          .limit(10)
          .select("title content author createdAt category"),
      ]);

      // Get moderation statistics
      const moderationStats = await Poem.aggregate([
        { $match: { moderatedBy: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      return {
        overview: {
          pendingPoems,
          pendingReviews,
          reportedContent,
          moderatedToday,
        },
        recentSubmissions,
        moderationStats,
        workload: {
          pendingQueue: pendingPoems + pendingReviews,
          dailyTarget: 20, // Configurable target
          completed: moderatedToday,
        },
      };
    } catch (error) {
      console.error("Error fetching moderator dashboard:", error);
      throw error;
    }
  }

  // ============= READER DASHBOARD =============

  /**
   * Get reader dashboard data
   */
  static async getReaderDashboard(userId) {
    try {
      const [
        favoritePoems,
        readingHistory,
        myReviews,
        recommendations,
        bookmarkedPoems,
        followedPoets,
      ] = await Promise.all([
        Collection.findOne({
          user: userId,
          type: "favorites",
          isSystemGenerated: true,
        }).populate({
          path: "poems.poem",
          populate: { path: "author", select: "username profile.fullName" },
        }),
        // Reading history would need to be tracked separately
        [],
        Review.find({ user: userId })
          .populate("poem", "title author")
          .sort({ createdAt: -1 })
          .limit(5),
        Poem.find({ status: "published" })
          .sort({ averageRating: -1, views: -1 })
          .limit(6)
          .populate("author", "username profile.fullName")
          .select("title content author averageRating views"),
        Poem.find({
          "bookmarks.user": userId,
          status: "published",
        })
          .populate("author", "username profile.fullName")
          .sort({ "bookmarks.bookmarkedAt": -1 })
          .limit(5)
          .select("title content author"),
        // Following would need to be implemented in User model
        [],
      ]);

      // Get reading statistics
      const readingStats = {
        totalReviews: myReviews.length,
        favoriteCount: favoritePoems?.poems?.length || 0,
        bookmarkedCount: bookmarkedPoems.length,
        // Add more stats as needed
      };

      // Get recent activity in the platform
      const recentActivity = await Poem.find({ status: "published" })
        .populate("author", "username profile.fullName")
        .sort({ publishedAt: -1 })
        .limit(10)
        .select("title author publishedAt category");

      return {
        overview: readingStats,
        favoritePoems: favoritePoems?.poems?.slice(0, 6) || [],
        readingHistory,
        myReviews,
        recommendations,
        bookmarkedPoems,
        followedPoets,
        recentActivity,
        discoverMore: {
          trendingPoems: await Poem.find({ status: "published" })
            .sort({ views: -1 })
            .limit(3)
            .populate("author", "username")
            .select("title author views"),
          newPoets: await User.find({ role: "poet" })
            .sort({ createdAt: -1 })
            .limit(3)
            .select("username profile.fullName createdAt"),
        },
      };
    } catch (error) {
      console.error("Error fetching reader dashboard:", error);
      throw error;
    }
  }

  // ============= UTILITY FUNCTIONS =============

  /**
   * Get recent activity across the platform
   */
  static async getRecentActivity() {
    try {
      const [recentUsers, recentPoems, recentReviews] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .select("username profile.fullName createdAt role"),
        Poem.find({ status: "published" })
          .populate("author", "username")
          .sort({ publishedAt: -1 })
          .limit(3)
          .select("title author publishedAt"),
        Review.find()
          .populate("user", "username")
          .populate("poem", "title")
          .sort({ createdAt: -1 })
          .limit(3)
          .select("user poem rating createdAt"),
      ]);

      return {
        recentUsers,
        recentPoems,
        recentReviews,
      };
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return { recentUsers: [], recentPoems: [], recentReviews: [] };
    }
  }

  /**
   * Get monthly growth statistics
   */
  static async getMonthlyGrowth() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [userGrowth, poemGrowth] = await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Poem.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
      ]);

      return {
        userGrowth,
        poemGrowth,
      };
    } catch (error) {
      console.error("Error fetching monthly growth:", error);
      return { userGrowth: [], poemGrowth: [] };
    }
  }

  /**
   * Get quick stats for any user
   */
  static async getQuickStats(req, res) {
    try {
      const userId = req.user.id;

      const [userPoems, userReviews, userCollections, totalViews] =
        await Promise.all([
          Poem.countDocuments({ author: userId }),
          Review.countDocuments({ user: userId }),
          Collection.countDocuments({ user: userId }),
          Poem.aggregate([
            { $match: { author: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalViews: { $sum: "$views" } } },
          ]),
        ]);

      const quickStats = {
        poems: userPoems,
        reviews: userReviews,
        collections: userCollections,
        views: totalViews[0]?.totalViews || 0,
      };

      res.json({
        success: true,
        stats: quickStats,
      });
    } catch (error) {
      console.error("Error fetching quick stats:", error);
      res.status(500).json({
        success: false,
        message: "فوری اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get personalized recommendations for user
   */
  static async getPersonalizedRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 6 } = req.query;

      // Get user's favorite categories and poets from their interactions
      const userInteractions = await Promise.all([
        Review.find({ user: userId }).populate("poem", "category author"),
        Collection.findOne({
          user: userId,
          type: "favorites",
        }).populate("poems.poem", "category author"),
      ]);

      const reviewedPoems = userInteractions[0]
        .map((r) => r.poem)
        .filter(Boolean);
      const favoritePoems =
        userInteractions[1]?.poems?.map((p) => p.poem).filter(Boolean) || [];

      const allInteractedPoems = [...reviewedPoems, ...favoritePoems];

      // Extract preferred categories and authors
      const preferredCategories = [
        ...new Set(allInteractedPoems.map((p) => p.category)),
      ];
      const preferredAuthors = [
        ...new Set(allInteractedPoems.map((p) => p.author)),
      ];

      // Find similar poems
      let recommendations = [];

      if (preferredCategories.length > 0 || preferredAuthors.length > 0) {
        recommendations = await Poem.find({
          status: "published",
          _id: { $nin: allInteractedPoems.map((p) => p._id) }, // Exclude already interacted
          $or: [
            { category: { $in: preferredCategories } },
            { author: { $in: preferredAuthors } },
          ],
        })
          .populate("author", "username profile.fullName")
          .sort({ averageRating: -1, views: -1 })
          .limit(parseInt(limit));
      }

      // If no preferences or not enough recommendations, add popular poems
      if (recommendations.length < limit) {
        const popularPoems = await Poem.find({
          status: "published",
          _id: {
            $nin: [
              ...allInteractedPoems.map((p) => p._id),
              ...recommendations.map((r) => r._id),
            ],
          },
        })
          .populate("author", "username profile.fullName")
          .sort({ views: -1, averageRating: -1 })
          .limit(parseInt(limit) - recommendations.length);

        recommendations = [...recommendations, ...popularPoems];
      }

      res.json({
        success: true,
        recommendations,
        basedOn: {
          categories: preferredCategories,
          totalInteractions: allInteractedPoems.length,
        },
      });
    } catch (error) {
      console.error("Error fetching personalized recommendations:", error);
      res.status(500).json({
        success: false,
        message: "ذاتی تجاویز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default DashboardController;
