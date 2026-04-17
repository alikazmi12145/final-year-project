import express from "express";
import { auth, adminAuth, optionalAuth } from "../middleware/auth.js";
import {
  addComment,
  getComments,
  deleteComment,
  toggleLikeComment,
  reportComment,
  getReportedComments,
  moderateCommentReport,
} from "../controllers/commentController.js";

const router = express.Router();

// ==============================================
// Comment Routes - /api/comments
// ==============================================

// ── Public / Optional Auth ──
// GET /api/comments/:postId - Get comments for a post
router.get("/:postId", optionalAuth, getComments);

// ── Authenticated Users ──
// POST /api/comments/:postId - Add comment to a post
router.post("/:postId", auth, addComment);

// DELETE /api/comments/item/:id - Delete a comment
router.delete("/item/:id", auth, deleteComment);

// POST /api/comments/:id/like - Toggle like on a comment
router.post("/:id/like", auth, toggleLikeComment);

// POST /api/comments/:id/report - Report a comment
router.post("/:id/report", auth, reportComment);

// ── Admin Only ──
// GET /api/comments/admin/reported - Get reported comments
router.get("/admin/reported", auth, adminAuth, getReportedComments);

// PUT /api/comments/admin/:commentId/reports/:reportId - Moderate report
router.put(
  "/admin/:commentId/reports/:reportId",
  auth,
  adminAuth,
  moderateCommentReport
);

export default router;
