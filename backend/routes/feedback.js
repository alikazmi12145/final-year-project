import express from "express";
import { auth, adminAuth, optionalAuth } from "../middleware/auth.js";
import {
  submitFeedback,
  getAllFeedback,
  deleteFeedback,
} from "../controllers/generalFeedbackController.js";

const router = express.Router();

// ==============================================
// General Feedback Routes - /api/feedback
// ==============================================

// ── Authenticated or Optional Auth ──
// POST /api/feedback - Submit feedback (optional auth - supports both logged-in and guest)
router.post("/", optionalAuth, submitFeedback);

// ── Admin Only ──
// GET /api/feedback - Get all feedback with stats
router.get("/", auth, adminAuth, getAllFeedback);

// DELETE /api/feedback/:id - Delete feedback
router.delete("/:id", auth, adminAuth, deleteFeedback);

export default router;
