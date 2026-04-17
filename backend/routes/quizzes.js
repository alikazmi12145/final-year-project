import express from "express";
import QuizController from "../controllers/quizController.js";
import FeedbackController from "../controllers/feedbackController.js";
import { auth, adminAuth, optionalAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const quizRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
});

// ============= QUIZ ROUTES =============

// Get all published quizzes (public)
router.get("/", quizRateLimit, QuizController.getAllQuizzes);

// Get quiz by ID (public, but auth populates user for canAttempt check)
router.get("/:id", optionalAuth, quizRateLimit, QuizController.getQuizById);

// Create quiz (admin only)
router.post("/", adminAuth, QuizController.createQuiz);

// Start a quiz attempt (authenticated)
router.post("/:id/start", auth, QuizController.startAttempt);

// Submit quiz answers (authenticated)
router.post("/:id/attempt", auth, QuizController.submitAttempt);

// Get quiz leaderboard (public)
router.get("/:id/leaderboard", quizRateLimit, QuizController.getQuizLeaderboard);

// ============= FEEDBACK ROUTES =============

// Submit feedback (authenticated)
router.post("/:id/feedback", auth, (req, res) => {
  req.body.targetType = "quiz";
  req.body.targetId = req.params.id;
  return FeedbackController.submitFeedback(req, res);
});

// Get feedback for a quiz (public)
router.get("/:id/feedback", quizRateLimit, (req, res) => {
  req.params.targetType = "quiz";
  req.params.targetId = req.params.id;
  return FeedbackController.getFeedback(req, res);
});

export default router;
