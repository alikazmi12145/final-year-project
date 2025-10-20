const User = require("../models/User");
const Poem = require("../models/Poem");
const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");
const path = require("path");

class ProfileService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 10; // 10 minutes cache
  }

  // Cache management
  getCacheKey(type, userId) {
    return `${type}_${userId}`;
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

  // Get comprehensive user profile
  async getUserProfile(userId, requestingUserId = null) {
    try {
      const cacheKey = this.getCacheKey("profile", userId);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const user = await User.findById(userId)
        .populate("followers", "name username profileImage")
        .populate("following", "name username profileImage")
        .lean();

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Get user's poems statistics
      const poemStats = await this.getUserPoemStats(userId);

      // Get user's recent activity
      const recentActivity = await this.getUserRecentActivity(userId);

      // Get user's favorite genres and themes
      const preferences = await this.getUserPreferences(userId);

      // Check if requesting user follows this profile
      const isFollowing = requestingUserId
        ? user.followers.some(
            (follower) => follower._id.toString() === requestingUserId
          )
        : false;

      // Remove sensitive information
      const {
        password,
        refreshToken,
        resetPasswordToken,
        resetPasswordExpires,
        ...publicProfile
      } = user;

      const profileData = {
        ...publicProfile,
        isFollowing,
        poemStats,
        recentActivity,
        preferences,
        profileCompleteness: this.calculateProfileCompleteness(user),
        accountAge: Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
        lastActive: user.lastLogin || user.createdAt,
      };

      this.setCache(cacheKey, { success: true, data: profileData });
      return { success: true, data: profileData };
    } catch (error) {
      console.error("Get user profile error:", error);
      return {
        success: false,
        error: "Failed to get user profile",
        details: error.message,
      };
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const {
        name,
        bio,
        location,
        website,
        socialLinks,
        preferences,
        privacy,
        notifications,
      } = updateData;

      const updateFields = {};

      // Basic information
      if (name !== undefined) updateFields.name = name.trim();
      if (bio !== undefined) updateFields.bio = bio.trim();
      if (location !== undefined) updateFields.location = location.trim();
      if (website !== undefined) updateFields.website = website.trim();

      // Social links
      if (socialLinks) {
        updateFields.socialLinks = {
          twitter: socialLinks.twitter?.trim() || "",
          instagram: socialLinks.instagram?.trim() || "",
          facebook: socialLinks.facebook?.trim() || "",
          youtube: socialLinks.youtube?.trim() || "",
          linkedin: socialLinks.linkedin?.trim() || "",
        };
      }

      // User preferences
      if (preferences) {
        updateFields.preferences = {
          language: preferences.language || "urdu",
          theme: preferences.theme || "light",
          fontSize: preferences.fontSize || "medium",
          poetryDisplay: preferences.poetryDisplay || "traditional",
          emailUpdates:
            preferences.emailUpdates !== undefined
              ? preferences.emailUpdates
              : true,
          publicProfile:
            preferences.publicProfile !== undefined
              ? preferences.publicProfile
              : true,
        };
      }

      // Privacy settings
      if (privacy) {
        updateFields.privacy = {
          showEmail:
            privacy.showEmail !== undefined ? privacy.showEmail : false,
          showLocation:
            privacy.showLocation !== undefined ? privacy.showLocation : true,
          showWebsite:
            privacy.showWebsite !== undefined ? privacy.showWebsite : true,
          allowMessages:
            privacy.allowMessages !== undefined ? privacy.allowMessages : true,
          showActivity:
            privacy.showActivity !== undefined ? privacy.showActivity : true,
        };
      }

      // Notification settings
      if (notifications) {
        updateFields.notifications = {
          email: notifications.email !== undefined ? notifications.email : true,
          push: notifications.push !== undefined ? notifications.push : true,
          newFollower:
            notifications.newFollower !== undefined
              ? notifications.newFollower
              : true,
          newComment:
            notifications.newComment !== undefined
              ? notifications.newComment
              : true,
          newLike:
            notifications.newLike !== undefined ? notifications.newLike : true,
          newsletter:
            notifications.newsletter !== undefined
              ? notifications.newsletter
              : true,
        };
      }

      updateFields.updatedAt = new Date();

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select(
        "-password -refreshToken -resetPasswordToken -resetPasswordExpires"
      );

      if (!updatedUser) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Clear cache
      const cacheKey = this.getCacheKey("profile", userId);
      this.cache.delete(cacheKey);

      return {
        success: true,
        data: updatedUser,
        message: "Profile updated successfully",
      };
    } catch (error) {
      console.error("Update user profile error:", error);
      return {
        success: false,
        error: "Failed to update profile",
        details: error.message,
      };
    }
  }

  // Upload and update profile image
  async updateProfileImage(userId, imageFile) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Delete old profile image from Cloudinary if exists
      if (user.profileImage && user.profileImage.includes("cloudinary")) {
        try {
          const publicId = user.profileImage.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        } catch (error) {
          console.warn("Failed to delete old profile image:", error.message);
        }
      }

      // Upload new image to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(imageFile, {
        folder: "profile_images",
        width: 400,
        height: 400,
        crop: "fill",
        quality: "auto",
        format: "jpg",
      });

      // Update user profile image
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          profileImage: uploadResult.secure_url,
          updatedAt: new Date(),
        },
        { new: true }
      ).select(
        "-password -refreshToken -resetPasswordToken -resetPasswordExpires"
      );

      // Clear cache
      const cacheKey = this.getCacheKey("profile", userId);
      this.cache.delete(cacheKey);

      return {
        success: true,
        data: {
          user: updatedUser,
          imageUrl: uploadResult.secure_url,
        },
        message: "Profile image updated successfully",
      };
    } catch (error) {
      console.error("Update profile image error:", error);
      return {
        success: false,
        error: "Failed to update profile image",
        details: error.message,
      };
    }
  }

  // Follow/Unfollow user
  async toggleFollow(followerId, followeeId) {
    try {
      if (followerId === followeeId) {
        return {
          success: false,
          error: "Cannot follow yourself",
        };
      }

      const follower = await User.findById(followerId);
      const followee = await User.findById(followeeId);

      if (!follower || !followee) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const isFollowing = follower.following.includes(followeeId);

      if (isFollowing) {
        // Unfollow
        await User.findByIdAndUpdate(followerId, {
          $pull: { following: followeeId },
        });
        await User.findByIdAndUpdate(followeeId, {
          $pull: { followers: followerId },
        });

        // Clear cache for both users
        this.cache.delete(this.getCacheKey("profile", followerId));
        this.cache.delete(this.getCacheKey("profile", followeeId));

        return {
          success: true,
          action: "unfollowed",
          message: `Unfollowed ${followee.name} successfully`,
        };
      } else {
        // Follow
        await User.findByIdAndUpdate(followerId, {
          $addToSet: { following: followeeId },
        });
        await User.findByIdAndUpdate(followeeId, {
          $addToSet: { followers: followerId },
        });

        // Clear cache for both users
        this.cache.delete(this.getCacheKey("profile", followerId));
        this.cache.delete(this.getCacheKey("profile", followeeId));

        return {
          success: true,
          action: "followed",
          message: `Now following ${followee.name}`,
        };
      }
    } catch (error) {
      console.error("Toggle follow error:", error);
      return {
        success: false,
        error: "Failed to update follow status",
        details: error.message,
      };
    }
  }

  // Get user's poem statistics
  async getUserPoemStats(userId) {
    try {
      const stats = await Poem.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalPoems: { $sum: 1 },
            totalViews: { $sum: "$viewCount" },
            totalLikes: { $sum: "$likesCount" },
            averageRating: { $avg: "$averageRating" },
            publishedPoems: {
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            draftPoems: {
              $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
            },
          },
        },
      ]);

      const poemStats = stats[0] || {
        totalPoems: 0,
        totalViews: 0,
        totalLikes: 0,
        averageRating: 0,
        publishedPoems: 0,
        draftPoems: 0,
      };

      // Get genre distribution
      const genreStats = await Poem.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: "$genre", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      poemStats.genreDistribution = genreStats;

      return poemStats;
    } catch (error) {
      console.error("Get user poem stats error:", error);
      return {
        totalPoems: 0,
        totalViews: 0,
        totalLikes: 0,
        averageRating: 0,
        publishedPoems: 0,
        draftPoems: 0,
        genreDistribution: [],
      };
    }
  }

  // Get user's recent activity
  async getUserRecentActivity(userId, limit = 10) {
    try {
      // Get recent poems
      const recentPoems = await Poem.find({ author: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title genre createdAt status viewCount likesCount")
        .lean();

      // Format activity data
      const activity = recentPoems.map((poem) => ({
        type: "poem_created",
        action: "Published a new poem",
        target: poem.title,
        targetId: poem._id,
        timestamp: poem.createdAt,
        metadata: {
          genre: poem.genre,
          status: poem.status,
          views: poem.viewCount,
          likes: poem.likesCount,
        },
      }));

      return activity;
    } catch (error) {
      console.error("Get user recent activity error:", error);
      return [];
    }
  }

  // Get user preferences (favorite genres, themes, etc.)
  async getUserPreferences(userId) {
    try {
      // Analyze user's poems to determine preferences
      const preferences = await Poem.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            favoriteGenres: {
              $push: "$genre",
            },
            favoriteThemes: {
              $push: "$theme",
            },
            preferredLanguage: {
              $push: "$language",
            },
          },
        },
        {
          $project: {
            favoriteGenres: {
              $slice: [
                {
                  $setUnion: ["$favoriteGenres"],
                },
                5,
              ],
            },
            favoriteThemes: {
              $slice: [
                {
                  $setUnion: ["$favoriteThemes"],
                },
                5,
              ],
            },
            preferredLanguage: {
              $arrayElemAt: [
                {
                  $setUnion: ["$preferredLanguage"],
                },
                0,
              ],
            },
          },
        },
      ]);

      return (
        preferences[0] || {
          favoriteGenres: [],
          favoriteThemes: [],
          preferredLanguage: "urdu",
        }
      );
    } catch (error) {
      console.error("Get user preferences error:", error);
      return {
        favoriteGenres: [],
        favoriteThemes: [],
        preferredLanguage: "urdu",
      };
    }
  }

  // Calculate profile completeness percentage
  calculateProfileCompleteness(user) {
    let completeness = 0;
    const fields = ["name", "bio", "profileImage", "location", "website"];

    fields.forEach((field) => {
      if (user[field] && user[field].toString().trim()) {
        completeness += 20;
      }
    });

    // Bonus for social links
    if (
      user.socialLinks &&
      Object.values(user.socialLinks).some((link) => link)
    ) {
      completeness += Math.min(
        20,
        Object.values(user.socialLinks).filter((link) => link).length * 4
      );
    }

    return Math.min(100, completeness);
  }

  // Get user's dashboard data
  async getUserDashboard(userId) {
    try {
      const cacheKey = this.getCacheKey("dashboard", userId);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const user = await User.findById(userId).lean();
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Get comprehensive statistics
      const [poemStats, recentActivity, notifications] = await Promise.all([
        this.getUserPoemStats(userId),
        this.getUserRecentActivity(userId, 20),
        this.getUserNotifications(userId, 10),
      ]);

      // Get achievements
      const achievements = this.calculateUserAchievements(poemStats, user);

      const dashboardData = {
        user: {
          name: user.name,
          username: user.username,
          profileImage: user.profileImage,
          role: user.role,
          joinDate: user.createdAt,
        },
        stats: poemStats,
        recentActivity,
        notifications,
        achievements,
        profileCompleteness: this.calculateProfileCompleteness(user),
        quickActions: this.getQuickActions(user.role),
      };

      this.setCache(cacheKey, { success: true, data: dashboardData });
      return { success: true, data: dashboardData };
    } catch (error) {
      console.error("Get user dashboard error:", error);
      return {
        success: false,
        error: "Failed to get dashboard data",
        details: error.message,
      };
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      // Get notifications from user's activities
      const notifications = [];

      // Get recent likes on user's poems
      const userPoems = await Poem.find({ author: userId })
        .populate("likes", "name")
        .sort({ updatedAt: -1 })
        .limit(5);

      userPoems.forEach((poem) => {
        if (poem.likes && poem.likes.length > 0) {
          poem.likes.forEach((liker) => {
            if (liker._id.toString() !== userId) {
              notifications.push({
                id: `like_${poem._id}_${liker._id}`,
                type: "like",
                message: `${liker.name} نے آپ کی نظم "${poem.title}" کو پسند کیا`,
                timestamp: poem.updatedAt,
                read: false,
              });
            }
          });
        }
      });

      // Get recent followers
      if (user.followers && user.followers.length > 0) {
        const recentFollowers = await User.find({
          _id: { $in: user.followers.slice(-3) },
        }).select("name createdAt");

        recentFollowers.forEach((follower) => {
          notifications.push({
            id: `follow_${follower._id}`,
            type: "follow",
            message: `${follower.name} نے آپ کو فالو کیا`,
            timestamp: follower.createdAt,
            read: true,
          });
        });
      }

      // Sort by timestamp and limit
      return notifications
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error("Get user notifications error:", error);
      return [];
    }
  }

  // Calculate user achievements
  calculateUserAchievements(stats, user) {
    const achievements = [];

    // Poem count achievements
    if (stats.totalPoems >= 1)
      achievements.push({
        name: "First Poem",
        description: "Published your first poem",
        icon: "📝",
        unlocked: true,
      });

    if (stats.totalPoems >= 10)
      achievements.push({
        name: "Prolific Writer",
        description: "Published 10 poems",
        icon: "✍️",
        unlocked: true,
      });

    if (stats.totalPoems >= 50)
      achievements.push({
        name: "Master Poet",
        description: "Published 50 poems",
        icon: "🏆",
        unlocked: true,
      });

    // View count achievements
    if (stats.totalViews >= 1000)
      achievements.push({
        name: "Popular Poet",
        description: "Reached 1000+ total views",
        icon: "👀",
        unlocked: true,
      });

    // Rating achievements
    if (stats.averageRating >= 4.5)
      achievements.push({
        name: "Highly Rated",
        description: "Maintained 4.5+ average rating",
        icon: "⭐",
        unlocked: true,
      });

    // Account age achievements
    const accountAge = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (accountAge >= 365)
      achievements.push({
        name: "Veteran",
        description: "Member for over a year",
        icon: "🎖️",
        unlocked: true,
      });

    return achievements;
  }

  // Get quick actions based on user role
  getQuickActions(role) {
    const baseActions = [
      { name: "Write New Poem", icon: "✏️", route: "/create-poem" },
      { name: "Browse Poems", icon: "📚", route: "/poems" },
      { name: "Edit Profile", icon: "👤", route: "/profile/edit" },
    ];

    if (role === "admin") {
      baseActions.push(
        { name: "Admin Dashboard", icon: "⚙️", route: "/admin" },
        { name: "Manage Users", icon: "👥", route: "/admin/users" }
      );
    }

    if (role === "poet") {
      baseActions.push(
        { name: "Poet Dashboard", icon: "🎭", route: "/poet-dashboard" },
        { name: "My Poems", icon: "📖", route: "/my-poems" }
      );
    }

    return baseActions;
  }

  // Search users
  async searchUsers(query, filters = {}, limit = 20, page = 1) {
    try {
      const { role, location, sortBy = "relevance" } = filters;
      const skip = (page - 1) * limit;

      let searchQuery = {};

      // Text search
      if (query && query.trim()) {
        const searchRegex = new RegExp(query.trim(), "i");
        searchQuery.$or = [
          { name: searchRegex },
          { username: searchRegex },
          { bio: searchRegex },
        ];
      }

      // Role filter
      if (role && role !== "all") {
        searchQuery.role = role;
      }

      // Location filter
      if (location && location.trim()) {
        searchQuery.location = new RegExp(location.trim(), "i");
      }

      // Sort options
      let sortOptions = {};
      switch (sortBy) {
        case "newest":
          sortOptions = { createdAt: -1 };
          break;
        case "oldest":
          sortOptions = { createdAt: 1 };
          break;
        case "name":
          sortOptions = { name: 1 };
          break;
        case "popular":
          sortOptions = { "followers.length": -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      const users = await User.find(searchQuery)
        .select(
          "name username profileImage role bio location followers following createdAt"
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await User.countDocuments(searchQuery);

      return {
        success: true,
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: skip + users.length < totalCount,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Search users error:", error);
      return {
        success: false,
        error: "Failed to search users",
        details: error.message,
      };
    }
  }

  // Clear cache
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

module.exports = new ProfileService();
