import Feedback from "../models/Feedback.js";
import mongoose from "mongoose";

/**
 * Feedback Controller for Bazm-E-Sukhan Platform
 * Handles feedback on contests and quizzes
 */
class FeedbackController {
  /**
   * Submit feedback for a contest or quiz
   */
  static async submitFeedback(req, res) {
    try {
      const { targetType, targetId, rating, comment } = req.body;
      const userId = req.user.userId || req.user.id;

      if (!targetType || !targetId || !rating) {
        return res.status(400).json({
          success: false,
          message: "ضروری معلومات مکمل کریں",
        });
      }

      if (!["contest", "quiz"].includes(targetType)) {
        return res.status(400).json({
          success: false,
          message: "غلط ٹارگٹ قسم",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({
          success: false,
          message: "غلط ٹارگٹ ID",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "ریٹنگ 1 سے 5 کے درمیان ہونی چاہیے",
        });
      }

      // Upsert: update if exists, create if not
      const feedback = await Feedback.findOneAndUpdate(
        { user: userId, targetType, targetId },
        {
          user: userId,
          targetType,
          targetId,
          rating: parseInt(rating),
          comment: comment?.trim(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await feedback.populate("user", "name profileImage");

      res.status(201).json({
        success: true,
        message: "آپ کی رائے کامیابی سے جمع ہوئی",
        feedback,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({
        success: false,
        message: "رائے جمع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get feedback for a specific contest or quiz
   */
  static async getFeedback(req, res) {
    try {
      const { targetType, targetId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ success: false, message: "غلط ID" });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const feedbacks = await Feedback.find({ targetType, targetId })
        .populate("user", "name profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Feedback.countDocuments({ targetType, targetId });

      // Calculate average rating
      const ratingAgg = await Feedback.aggregate([
        {
          $match: {
            targetType,
            targetId: new mongoose.Types.ObjectId(targetId),
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            count: { $sum: 1 },
            distribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      const stats = ratingAgg[0] || { averageRating: 0, count: 0, distribution: [] };

      // Build distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      (stats.distribution || []).forEach((r) => {
        distribution[r] = (distribution[r] || 0) + 1;
      });

      res.json({
        success: true,
        feedbacks,
        stats: {
          averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
          totalCount: stats.count || 0,
          distribution,
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
        },
      });
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({
        success: false,
        message: "رائے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default FeedbackController;
