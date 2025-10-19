import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Review from "../models/Review.js";
import Collection from "../models/Collection.js";
import Contest from "../models/Contest.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * User Controller for Bazm-E-Sukhan Platform
 * Handles user profile management, account settings, and user interactions
 */

class UserController {
  // ============= PROFILE MANAGEMENT =============

  /**
   * Get user profile by ID or username
   */
  static async getUserProfile(req, res) {
    try {
      const { identifier } = req.params; // Can be user ID or username
      const currentUserId = req.user?.id;

      let query;
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        query = { _id: identifier };
      } else {
        query = { username: identifier };
      }

      const user = await User.findOne(query)
        .select(
          "-password -refreshTokens -resetPasswordToken -emailVerificationToken"
        )
        .populate("following", "username profile.fullName profile.avatar")
        .populate("followers", "username profile.fullName profile.avatar")
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Get user's public statistics
      const [
        poemsCount,
        collectionsCount,
        reviewsCount,
        followersCount,
        followingCount,
      ] = await Promise.all([
        Poem.countDocuments({ author: user._id, status: "published" }),
        Collection.countDocuments({ author: user._id, isPublic: true }),
        Review.countDocuments({ author: user._id }),
        User.countDocuments({ following: user._id }),
        User.countDocuments({ followers: user._id }),
      ]);

      // Get recent poems
      const recentPoems = await Poem.find({
        author: user._id,
        status: "published",
      })
        .select("title excerpt createdAt likes views")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      // Check if current user is following this user
      let isFollowing = false;
      let isOwnProfile = false;

      if (currentUserId) {
        isOwnProfile = user._id.toString() === currentUserId;
        if (!isOwnProfile) {
          const currentUser = await User.findById(currentUserId).select(
            "following"
          );
          isFollowing = currentUser?.following.includes(user._id) || false;
        }
      }

      const profileData = {
        ...user,
        statistics: {
          poemsCount,
          collectionsCount,
          reviewsCount,
          followersCount,
          followingCount,
        },
        recentPoems,
        isFollowing,
        isOwnProfile,
      };

      res.json({
        success: true,
        user: profileData,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی پروفائل حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const {
        fullName,
        bio,
        location,
        website,
        socialLinks,
        interests,
        preferredLanguage,
        isProfilePublic = true,
        poeticStyle,
        writingExperience,
      } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Update profile fields
      if (fullName) user.profile.fullName = fullName.trim();
      if (bio) user.profile.bio = bio.trim();
      if (location) user.profile.location = location.trim();
      if (website) user.profile.website = website.trim();
      if (socialLinks) user.profile.socialLinks = socialLinks;
      if (interests) user.profile.interests = interests;
      if (preferredLanguage) user.profile.preferredLanguage = preferredLanguage;
      if (isProfilePublic !== undefined)
        user.profile.isProfilePublic = isProfilePublic;
      if (poeticStyle) user.profile.poeticStyle = poeticStyle;
      if (writingExperience) user.profile.writingExperience = writingExperience;

      // Handle avatar upload
      if (req.files && req.files.avatar) {
        user.profile.avatar = {
          url: req.files.avatar[0].path,
          publicId: req.files.avatar[0].filename,
        };
      }

      // Handle cover image upload
      if (req.files && req.files.coverImage) {
        user.profile.coverImage = {
          url: req.files.coverImage[0].path,
          publicId: req.files.coverImage[0].filename,
        };
      }

      user.updatedAt = new Date();
      await user.save();

      // Return updated user without sensitive data
      const updatedUser = await User.findById(userId).select(
        "-password -refreshTokens -resetPasswordToken -emailVerificationToken"
      );

      res.json({
        success: true,
        message: "پروفائل کامیابی سے اپ ڈیٹ ہوئی",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        message: "پروفائل اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "تمام فیلڈز ضروری ہیں",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "نیا پاس ورڈ اور تصدیق میں فرق ہے",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "موجودہ پاس ورڈ غلط ہے",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedNewPassword;
      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: "پاس ورڈ کامیابی سے تبدیل ہو گیا",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: "پاس ورڈ تبدیل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update account settings
   */
  static async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const {
        emailNotifications,
        pushNotifications,
        privacySettings,
        languagePreference,
        theme,
      } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Update settings
      if (emailNotifications !== undefined) {
        user.settings.emailNotifications = emailNotifications;
      }
      if (pushNotifications !== undefined) {
        user.settings.pushNotifications = pushNotifications;
      }
      if (privacySettings !== undefined) {
        user.settings.privacySettings = privacySettings;
      }
      if (languagePreference) {
        user.settings.languagePreference = languagePreference;
      }
      if (theme) {
        user.settings.theme = theme;
      }

      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: "سیٹنگز کامیابی سے اپ ڈیٹ ہوئیں",
        settings: user.settings,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        success: false,
        message: "سیٹنگز اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= FOLLOW SYSTEM =============

  /**
   * Follow/Unfollow a user
   */
  static async toggleFollow(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user.id;

      if (targetUserId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: "آپ خود کو فالو نہیں کر سکتے",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const [currentUser, targetUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetUserId),
      ]);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      const isFollowing = currentUser.following.includes(targetUserId);

      if (isFollowing) {
        // Unfollow
        currentUser.following.pull(targetUserId);
        targetUser.followers.pull(currentUserId);
      } else {
        // Follow
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);
      }

      await Promise.all([currentUser.save(), targetUser.save()]);

      res.json({
        success: true,
        message: isFollowing ? "فالو ہٹا دیا گیا" : "فالو کر دیا گیا",
        isFollowing: !isFollowing,
        followersCount: targetUser.followers.length,
      });
    } catch (error) {
      console.error("Error toggling follow:", error);
      res.status(500).json({
        success: false,
        message: "فالو کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's followers
   */
  static async getFollowers(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const user = await User.findById(userId).populate({
        path: "followers",
        select: "username profile.fullName profile.avatar profile.bio",
        options: {
          skip,
          limit: limitNum,
          sort: { createdAt: -1 },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      const totalFollowers = user.followers.length;

      res.json({
        success: true,
        followers: user.followers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalFollowers / limitNum),
          totalFollowers,
          hasNext: pageNum < Math.ceil(totalFollowers / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({
        success: false,
        message: "فالورز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get users that the user is following
   */
  static async getFollowing(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const user = await User.findById(userId).populate({
        path: "following",
        select: "username profile.fullName profile.avatar profile.bio",
        options: {
          skip,
          limit: limitNum,
          sort: { createdAt: -1 },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      const totalFollowing = user.following.length;

      res.json({
        success: true,
        following: user.following,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalFollowing / limitNum),
          totalFollowing,
          hasNext: pageNum < Math.ceil(totalFollowing / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({
        success: false,
        message: "فالونگ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= USER CONTENT =============

  /**
   * Get user's poems
   */
  static async getUserPoems(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 12, status = "published" } = req.query;
      const currentUserId = req.user?.id;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      // Build query
      let query = { author: userId };

      // Only allow viewing non-published poems if it's the user's own profile or admin
      if (status !== "published") {
        if (currentUserId !== userId && req.user?.role !== "admin") {
          query.status = "published";
        } else {
          query.status = status;
        }
      } else {
        query.status = "published";
      }

      const poems = await Poem.find(query)
        .populate("author", "username profile.fullName profile.avatar")
        .sort({ createdAt: -1 })
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
      console.error("Error fetching user poems:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's collections
   */
  static async getUserCollections(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 12 } = req.query;
      const currentUserId = req.user?.id;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      // Build query - only show public collections unless it's own profile
      let query = { author: userId };
      if (currentUserId !== userId) {
        query.isPublic = true;
      }

      const collections = await Collection.find(query)
        .populate("author", "username profile.fullName profile.avatar")
        .populate("poems", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

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
        message: "صارف کے مجموعے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's activity feed
   */
  static async getUserActivity(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      // Get recent poems
      const recentPoems = await Poem.find({
        author: userId,
        status: "published",
      })
        .select("title createdAt")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .lean();

      // Get recent reviews
      const recentReviews = await Review.find({ author: userId })
        .populate("poem", "title")
        .select("rating comment createdAt")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .lean();

      // Combine and sort activities
      const activities = [];

      recentPoems.forEach((poem) => {
        activities.push({
          type: "poem",
          action: "published",
          content: poem,
          createdAt: poem.createdAt,
        });
      });

      recentReviews.forEach((review) => {
        activities.push({
          type: "review",
          action: "reviewed",
          content: review,
          createdAt: review.createdAt,
        });
      });

      // Sort by date and paginate
      activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const paginatedActivities = activities.slice(skip, skip + limitNum);

      res.json({
        success: true,
        activities: paginatedActivities,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(activities.length / limitNum),
          totalActivities: activities.length,
          hasNext: pageNum < Math.ceil(activities.length / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی سرگرمی حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= SEARCH & DISCOVERY =============

  /**
   * Search users
   */
  static async searchUsers(req, res) {
    try {
      const {
        q: searchQuery,
        page = 1,
        limit = 20,
        role,
        location,
        sortBy = "relevance",
      } = req.query;

      if (!searchQuery || searchQuery.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "تلاش کی عبارت درج کریں",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      let query = {
        $or: [
          { username: { $regex: searchQuery, $options: "i" } },
          { "profile.fullName": { $regex: searchQuery, $options: "i" } },
          { "profile.bio": { $regex: searchQuery, $options: "i" } },
        ],
      };

      // Add filters
      if (role && role !== "all") {
        query.role = role;
      }

      if (location) {
        query["profile.location"] = { $regex: location, $options: "i" };
      }

      // Only show verified and public profiles
      query.isVerified = true;
      query["profile.isProfilePublic"] = true;

      // Build sort object
      let sortObj = {};
      switch (sortBy) {
        case "newest":
          sortObj = { createdAt: -1 };
          break;
        case "followers":
          sortObj = { "followers.length": -1 };
          break;
        case "poems":
          // This would need aggregation for accurate poem count
          sortObj = { createdAt: -1 };
          break;
        default:
          sortObj = { createdAt: -1 };
      }

      const users = await User.find(query)
        .select("username profile role followers following createdAt")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalUsers = await User.countDocuments(query);

      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const [poemsCount, followersCount] = await Promise.all([
            Poem.countDocuments({ author: user._id, status: "published" }),
            User.countDocuments({ following: user._id }),
          ]);

          return {
            ...user,
            stats: {
              poemsCount,
              followersCount,
            },
          };
        })
      );

      res.json({
        success: true,
        users: usersWithStats,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNext: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrev: pageNum > 1,
        },
        searchQuery,
      });
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({
        success: false,
        message: "صارف تلاش کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get suggested users to follow
   */
  static async getSuggestedUsers(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const currentUser = await User.findById(userId).select("following");

      // Get users that current user is not following
      const suggestedUsers = await User.find({
        _id: { $ne: userId },
        _id: { $nin: currentUser.following },
        isVerified: true,
        "profile.isProfilePublic": true,
      })
        .select("username profile followers")
        .sort({ "followers.length": -1, createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      // Get stats for suggested users
      const usersWithStats = await Promise.all(
        suggestedUsers.map(async (user) => {
          const [poemsCount, followersCount] = await Promise.all([
            Poem.countDocuments({ author: user._id, status: "published" }),
            User.countDocuments({ following: user._id }),
          ]);

          return {
            ...user,
            stats: {
              poemsCount,
              followersCount,
            },
          };
        })
      );

      res.json({
        success: true,
        users: usersWithStats,
      });
    } catch (error) {
      console.error("Error fetching suggested users:", error);
      res.status(500).json({
        success: false,
        message: "تجویز کردہ صارفین حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= ACCOUNT MANAGEMENT =============

  /**
   * Deactivate account
   */
  static async deactivateAccount(req, res) {
    try {
      const userId = req.user.id;
      const { reason, feedback } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Mark account as deactivated
      user.isActive = false;
      user.deactivatedAt = new Date();
      user.deactivationReason = reason;
      user.deactivationFeedback = feedback;

      await user.save();

      res.json({
        success: true,
        message: "اکاؤنٹ غیر فعال ہو گیا",
      });
    } catch (error) {
      console.error("Error deactivating account:", error);
      res.status(500).json({
        success: false,
        message: "اکاؤنٹ غیر فعال کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's dashboard data
   */
  static async getUserDashboard(req, res) {
    try {
      const userId = req.user.id;

      const [
        user,
        poemsCount,
        collectionsCount,
        followersCount,
        followingCount,
        recentPoems,
        recentActivity,
      ] = await Promise.all([
        User.findById(userId).select("-password -refreshTokens"),
        Poem.countDocuments({ author: userId }),
        Collection.countDocuments({ author: userId }),
        User.countDocuments({ following: userId }),
        User.countDocuments({ followers: userId }),
        Poem.find({ author: userId })
          .select("title status views likes createdAt")
          .sort({ createdAt: -1 })
          .limit(5),
        Poem.find({ author: userId })
          .select("title createdAt")
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

      const dashboardData = {
        user,
        statistics: {
          poemsCount,
          collectionsCount,
          followersCount,
          followingCount,
        },
        recentPoems,
        recentActivity,
      };

      res.json({
        success: true,
        dashboard: dashboardData,
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
}

export default UserController;
