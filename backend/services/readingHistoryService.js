import ReadingHistory from "../models/ReadingHistory.js";
import Poem from "../models/Poem.js";
import mongoose from "mongoose";

/**
 * Reading History Service
 * Handles all reading history-related business logic
 */
class ReadingHistoryService {
  /**
   * Add or update reading history
   */
  static async addOrUpdateHistory(userId, poemId) {
    try {
      // Validate poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        throw new Error("Poem not found");
      }

      // Add or update history entry
      const history = await ReadingHistory.addOrUpdate(userId, poemId);

      // Populate poem details
      await history.populate({
        path: "poem",
        select: "title urduTitle author verses category",
        populate: {
          path: "author",
          select: "name profileImage",
        },
      });

      return {
        success: true,
        message: "Reading history updated",
        history,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's reading history with pagination
   */
  static async getUserHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = "readAt",
      sortOrder = "desc",
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [history, total] = await Promise.all([
      ReadingHistory.find({ user: userId })
        .populate({
          path: "poem",
          select: "title urduTitle content author verses category status",
          populate: {
            path: "author",
            select: "name profileImage",
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReadingHistory.countDocuments({ user: userId }),
    ]);

    return {
      success: true,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent reading history (last N items)
   */
  static async getRecentHistory(userId, limit = 10) {
    const history = await ReadingHistory.find({ user: userId })
      .populate({
        path: "poem",
        select: "title urduTitle author verses category",
        populate: {
          path: "author",
          select: "name profileImage",
        },
      })
      .sort({ readAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return {
      success: true,
      history,
    };
  }

  /**
   * Clear user's reading history
   */
  static async clearHistory(userId) {
    const result = await ReadingHistory.deleteMany({ user: userId });

    return {
      success: true,
      message: `Cleared ${result.deletedCount} history entries`,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Remove specific history entry
   */
  static async removeHistoryEntry(userId, historyId) {
    const history = await ReadingHistory.findOne({
      _id: historyId,
      user: userId,
    });

    if (!history) {
      throw new Error("History entry not found");
    }

    await history.deleteOne();

    return {
      success: true,
      message: "History entry removed successfully",
    };
  }

  /**
   * Get reading statistics for user
   */
  static async getUserStats(userId) {
    const stats = await ReadingHistory.getUserStats(userId);

    const categoryCounts = await ReadingHistory.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "poems",
          localField: "poem",
          foreignField: "_id",
          as: "poemData",
        },
      },
      {
        $unwind: "$poemData",
      },
      {
        $group: {
          _id: "$poemData.category",
          count: { $sum: 1 },
          totalReads: { $sum: "$readCount" },
        },
      },
      {
        $sort: { totalReads: -1 },
      },
    ]);

    const topPoems = await ReadingHistory.find({ user: userId })
      .populate({
        path: "poem",
        select: "title urduTitle author",
        populate: {
          path: "author",
          select: "name",
        },
      })
      .sort({ readCount: -1 })
      .limit(5)
      .lean();

    return {
      success: true,
      stats: {
        ...stats,
        byCategory: categoryCounts,
        topPoems,
      },
    };
  }

  /**
   * Get reading streak (consecutive days)
   */
  static async getReadingStreak(userId) {
    const history = await ReadingHistory.find({ user: userId })
      .sort({ readAt: -1 })
      .select("readAt")
      .lean();

    if (history.length === 0) {
      return {
        success: true,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    let lastDate = new Date(history[0].readAt);
    lastDate.setHours(0, 0, 0, 0);

    // Check if current streak is active (read today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate >= yesterday) {
      currentStreak = 1;
    }

    for (let i = 1; i < history.length; i++) {
      const currentDate = new Date(history[i].readAt);
      currentDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (lastDate - currentDate) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        tempStreak++;
        if (currentStreak > 0) {
          currentStreak++;
        }
      } else if (dayDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }

      lastDate = currentDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return {
      success: true,
      currentStreak,
      longestStreak,
    };
  }
}

export default ReadingHistoryService;
