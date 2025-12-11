import express from "express";
import ReadingHistoryController from "../controllers/readingHistoryController.js";
import { auth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for history operations
const historyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (higher than bookmarks)
  message: "Too many history requests, please try again later.",
});

/**
 * @route   POST /api/history
 * @desc    Add or update reading history
 * @access  Private
 */
router.post("/", auth, historyLimiter, ReadingHistoryController.addHistory);

/**
 * @route   GET /api/history
 * @desc    Get user's reading history
 * @access  Private
 * @query   page, limit, sortBy, sortOrder
 */
router.get("/", auth, ReadingHistoryController.getUserHistory);

/**
 * @route   GET /api/history/recent
 * @desc    Get recent reading history
 * @access  Private
 * @query   limit
 */
router.get("/recent", auth, ReadingHistoryController.getRecentHistory);

/**
 * @route   GET /api/history/stats
 * @desc    Get reading statistics
 * @access  Private
 */
router.get("/stats", auth, ReadingHistoryController.getStats);

/**
 * @route   GET /api/history/streak
 * @desc    Get reading streak
 * @access  Private
 */
router.get("/streak", auth, ReadingHistoryController.getStreak);

/**
 * @route   DELETE /api/history/clear
 * @desc    Clear all reading history
 * @access  Private
 */
router.delete("/clear", auth, ReadingHistoryController.clearHistory);

/**
 * @route   DELETE /api/history/:historyId
 * @desc    Remove specific history entry
 * @access  Private
 */
router.delete("/:historyId", auth, ReadingHistoryController.removeHistoryEntry);

export default router;
