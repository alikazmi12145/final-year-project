import Bookmark from "../models/Bookmark.js";
import Poem from "../models/Poem.js";
import mongoose from "mongoose";

/**
 * Bookmark Service
 * Handles all bookmark-related business logic
 */
class BookmarkService {
  /**
   * Add a bookmark
   */
  static async addBookmark(userId, poemId) {
    try {
      // Validate poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        throw new Error("Poem not found");
      }

      // Check if already bookmarked
      const existing = await Bookmark.findOne({ user: userId, poem: poemId });
      if (existing) {
        return {
          success: true,
          message: "Already bookmarked",
          bookmark: existing,
          isNew: false,
        };
      }

      // Create bookmark
      const bookmark = await Bookmark.create({
        user: userId,
        poem: poemId,
      });

      // Populate poem details
      await bookmark.populate("poem", "title urduTitle author");

      return {
        success: true,
        message: "Bookmark added successfully",
        bookmark,
        isNew: true,
      };
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        const existing = await Bookmark.findOne({
          user: userId,
          poem: poemId,
        }).populate("poem", "title urduTitle author");
        return {
          success: true,
          message: "Already bookmarked",
          bookmark: existing,
          isNew: false,
        };
      }
      throw error;
    }
  }

  /**
   * Remove a bookmark
   */
  static async removeBookmark(userId, bookmarkId) {
    const bookmark = await Bookmark.findOne({
      _id: bookmarkId,
      user: userId,
    });

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    await bookmark.deleteOne();

    return {
      success: true,
      message: "Bookmark removed successfully",
    };
  }

  /**
   * Remove bookmark by poem ID
   */
  static async removeBookmarkByPoem(userId, poemId) {
    const bookmark = await Bookmark.findOne({
      user: userId,
      poem: poemId,
    });

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    await bookmark.deleteOne();

    return {
      success: true,
      message: "Bookmark removed successfully",
    };
  }

  /**
   * Get user's bookmarks with pagination
   */
  static async getUserBookmarks(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [bookmarks, total] = await Promise.all([
      Bookmark.find({ user: userId })
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
      Bookmark.countDocuments({ user: userId }),
    ]);

    return {
      success: true,
      bookmarks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if poem is bookmarked by user
   */
  static async isBookmarked(userId, poemId) {
    const bookmark = await Bookmark.findOne({ user: userId, poem: poemId });
    return {
      success: true,
      isBookmarked: !!bookmark,
      bookmarkId: bookmark?._id || null,
    };
  }

  /**
   * Get bookmark statistics for user
   */
  static async getUserStats(userId) {
    const total = await Bookmark.countDocuments({ user: userId });

    const categoryCounts = await Bookmark.aggregate([
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
        },
      },
    ]);

    return {
      success: true,
      stats: {
        total,
        byCategory: categoryCounts,
      },
    };
  }

  /**
   * Clear all bookmarks for user
   */
  static async clearAllBookmarks(userId) {
    const result = await Bookmark.deleteMany({ user: userId });

    return {
      success: true,
      message: `Removed ${result.deletedCount} bookmarks`,
      deletedCount: result.deletedCount,
    };
  }
}

export default BookmarkService;
