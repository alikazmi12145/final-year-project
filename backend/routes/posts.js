import express from "express";
import { auth, adminAuth, optionalAuth } from "../middleware/auth.js";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  reportPost,
  getReportedPosts,
  moderateReport,
} from "../controllers/postController.js";

const router = express.Router();

// ==============================================
// Post Routes - /api/posts
// ==============================================

// ── Public / Optional Auth ──
// GET /api/posts - Get all posts (with optional auth for like status)
router.get("/", optionalAuth, getPosts);

// GET /api/posts/:id - Get single post
router.get("/:id", optionalAuth, getPostById);

// ── Authenticated Users ──
// POST /api/posts/:id/like - Toggle like on a post
router.post("/:id/like", auth, toggleLikePost);

// POST /api/posts/:id/report - Report a post
router.post("/:id/report", auth, reportPost);

// ── Admin Only ──
// POST /api/posts - Create a new post
router.post("/", auth, adminAuth, createPost);

// PUT /api/posts/:id - Update a post
router.put("/:id", auth, adminAuth, updatePost);

// DELETE /api/posts/:id - Delete a post
router.delete("/:id", auth, adminAuth, deletePost);

// GET /api/posts/admin/reported - Get reported posts
router.get("/admin/reported", auth, adminAuth, getReportedPosts);

// PUT /api/posts/admin/:postId/reports/:reportId - Moderate a report
router.put("/admin/:postId/reports/:reportId", auth, adminAuth, moderateReport);

export default router;
