import express from "express";
import BookmarkController from "../controllers/bookmarkController.js";
import { auth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for bookmark operations
const bookmarkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many bookmark requests, please try again later.",
});

/**
 * @route   POST /api/bookmarks
 * @desc    Add a bookmark
 * @access  Private
 */
router.post("/", auth, bookmarkLimiter, BookmarkController.addBookmark);

/**
 * @route   GET /api/bookmarks
 * @desc    Get user's bookmarks
 * @access  Private
 * @query   page, limit, sortBy, sortOrder
 */
router.get("/", auth, BookmarkController.getUserBookmarks);

/**
 * @route   GET /api/bookmarks/stats
 * @desc    Get bookmark statistics
 * @access  Private
 */
router.get("/stats", auth, BookmarkController.getStats);

/**
 * @route   GET /api/bookmarks/check/:poemId
 * @desc    Check if poem is bookmarked
 * @access  Private
 */
router.get("/check/:poemId", auth, BookmarkController.checkBookmark);

/**
 * @route   DELETE /api/bookmarks/clear
 * @desc    Clear all bookmarks
 * @access  Private
 */
router.delete("/clear", auth, BookmarkController.clearBookmarks);

/**
 * @route   DELETE /api/bookmarks/poem/:poemId
 * @desc    Remove bookmark by poem ID
 * @access  Private
 */
router.delete("/poem/:poemId", auth, BookmarkController.removeByPoemId);

/**
 * @route   DELETE /api/bookmarks/:bookmarkId
 * @desc    Remove bookmark by ID
 * @access  Private
 */
router.delete("/:bookmarkId", auth, BookmarkController.removeBookmark);

export default router;
