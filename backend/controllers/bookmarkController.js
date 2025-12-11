import BookmarkService from "../services/bookmarkService.js";

/**
 * Bookmark Controller
 * Handles HTTP requests for bookmark operations
 */
class BookmarkController {
  /**
   * Add a bookmark
   * @route POST /api/bookmarks
   */
  static async addBookmark(req, res) {
    try {
      const userId = req.user.userId;
      const { poemId } = req.body;

      if (!poemId) {
        return res.status(400).json({
          success: false,
          message: "Poem ID is required",
        });
      }

      const result = await BookmarkService.addBookmark(userId, poemId);

      return res.status(result.isNew ? 201 : 200).json(result);
    } catch (error) {
      console.error("Add bookmark error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add bookmark",
      });
    }
  }

  /**
   * Get user's bookmarks
   * @route GET /api/bookmarks
   */
  static async getUserBookmarks(req, res) {
    try {
      const userId = req.user.userId;
      const { page, limit, sortBy, sortOrder } = req.query;

      const result = await BookmarkService.getUserBookmarks(userId, {
        page,
        limit,
        sortBy,
        sortOrder,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get bookmarks error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch bookmarks",
      });
    }
  }

  /**
   * Remove a bookmark by ID
   * @route DELETE /api/bookmarks/:bookmarkId
   */
  static async removeBookmark(req, res) {
    try {
      const userId = req.user.userId;
      const { bookmarkId } = req.params;

      const result = await BookmarkService.removeBookmark(userId, bookmarkId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Remove bookmark error:", error);
      return res.status(error.message === "Bookmark not found" ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to remove bookmark",
      });
    }
  }

  /**
   * Remove bookmark by poem ID
   * @route DELETE /api/bookmarks/poem/:poemId
   */
  static async removeByPoemId(req, res) {
    try {
      const userId = req.user.userId;
      const { poemId } = req.params;

      const result = await BookmarkService.removeBookmarkByPoem(userId, poemId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Remove bookmark by poem error:", error);
      return res.status(error.message === "Bookmark not found" ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to remove bookmark",
      });
    }
  }

  /**
   * Check if poem is bookmarked
   * @route GET /api/bookmarks/check/:poemId
   */
  static async checkBookmark(req, res) {
    try {
      const userId = req.user.userId;
      const { poemId } = req.params;

      const result = await BookmarkService.isBookmarked(userId, poemId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Check bookmark error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to check bookmark",
      });
    }
  }

  /**
   * Get bookmark statistics
   * @route GET /api/bookmarks/stats
   */
  static async getStats(req, res) {
    try {
      const userId = req.user.userId;

      const result = await BookmarkService.getUserStats(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get bookmark stats error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch statistics",
      });
    }
  }

  /**
   * Clear all bookmarks
   * @route DELETE /api/bookmarks/clear
   */
  static async clearBookmarks(req, res) {
    try {
      const userId = req.user.userId;

      const result = await BookmarkService.clearAllBookmarks(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Clear bookmarks error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to clear bookmarks",
      });
    }
  }
}

export default BookmarkController;
