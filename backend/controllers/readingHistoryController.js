import ReadingHistoryService from "../services/readingHistoryService.js";

/**
 * Reading History Controller
 * Handles HTTP requests for reading history operations
 */
class ReadingHistoryController {
  /**
   * Add or update reading history
   * @route POST /api/history
   */
  static async addHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { poemId } = req.body;

      if (!poemId) {
        return res.status(400).json({
          success: false,
          message: "Poem ID is required",
        });
      }

      const result = await ReadingHistoryService.addOrUpdateHistory(
        userId,
        poemId
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error("Add history error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update reading history",
      });
    }
  }

  /**
   * Get user's reading history
   * @route GET /api/history
   */
  static async getUserHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { page, limit, sortBy, sortOrder } = req.query;

      const result = await ReadingHistoryService.getUserHistory(userId, {
        page,
        limit,
        sortBy,
        sortOrder,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get history error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch reading history",
      });
    }
  }

  /**
   * Get recent reading history
   * @route GET /api/history/recent
   */
  static async getRecentHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { limit } = req.query;

      const result = await ReadingHistoryService.getRecentHistory(
        userId,
        limit
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get recent history error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch recent history",
      });
    }
  }

  /**
   * Clear user's reading history
   * @route DELETE /api/history/clear
   */
  static async clearHistory(req, res) {
    try {
      const userId = req.user.userId;

      const result = await ReadingHistoryService.clearHistory(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Clear history error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to clear history",
      });
    }
  }

  /**
   * Remove specific history entry
   * @route DELETE /api/history/:historyId
   */
  static async removeHistoryEntry(req, res) {
    try {
      const userId = req.user.userId;
      const { historyId } = req.params;

      const result = await ReadingHistoryService.removeHistoryEntry(
        userId,
        historyId
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error("Remove history entry error:", error);
      return res
        .status(error.message === "History entry not found" ? 404 : 500)
        .json({
          success: false,
          message: error.message || "Failed to remove history entry",
        });
    }
  }

  /**
   * Get reading statistics
   * @route GET /api/history/stats
   */
  static async getStats(req, res) {
    try {
      const userId = req.user.userId;

      const result = await ReadingHistoryService.getUserStats(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get history stats error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch statistics",
      });
    }
  }

  /**
   * Get reading streak
   * @route GET /api/history/streak
   */
  static async getStreak(req, res) {
    try {
      const userId = req.user.userId;

      const result = await ReadingHistoryService.getReadingStreak(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get reading streak error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch reading streak",
      });
    }
  }
}

export default ReadingHistoryController;
