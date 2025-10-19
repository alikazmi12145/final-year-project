import Review from "../models/Review.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * Review Controller for Bazm-E-Sukhan Platform
 * Handles reviews, ratings, and feedback system for poems
 */

class ReviewController {
  // ============= REVIEW MANAGEMENT =============

  /**
   * Get all reviews with filtering and pagination
   */
  static async getAllReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        poemId,
        authorId,
        rating,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = {};

      if (poemId && mongoose.Types.ObjectId.isValid(poemId)) {
        query.poem = poemId;
      }

      if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
        query.author = authorId;
      }

      if (rating && !isNaN(rating)) {
        query.rating = parseInt(rating);
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const reviews = await Review.find(query)
        .populate("author", "username profile.fullName profile.avatar")
        .populate("poem", "title author")
        .populate("poem.author", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalReviews = await Review.countDocuments(query);

      res.json({
        success: true,
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalReviews / limitNum),
          totalReviews,
          hasNext: pageNum < Math.ceil(totalReviews / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({
        success: false,
        message: "جائزے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get reviews for a specific poem
   */
  static async getPoemReviews(req, res) {
    try {
      const { poemId } = req.params;
      const { page = 1, limit = 10, sortBy = "createdAt" } = req.query;

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط نظم ID",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Check if poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "نظم موجود نہیں",
        });
      }

      const reviews = await Review.find({ poem: poemId })
        .populate("author", "username profile.fullName profile.avatar")
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalReviews = await Review.countDocuments({ poem: poemId });

      // Calculate rating statistics
      const ratingStats = await Review.aggregate([
        { $match: { poem: new mongoose.Types.ObjectId(poemId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      let statistics = {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

      if (ratingStats.length > 0) {
        const stats = ratingStats[0];
        statistics.averageRating = Math.round(stats.averageRating * 10) / 10;
        statistics.totalReviews = stats.totalReviews;

        // Calculate distribution
        stats.ratingDistribution.forEach((rating) => {
          statistics.distribution[rating]++;
        });
      }

      res.json({
        success: true,
        reviews,
        statistics,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalReviews / limitNum),
          totalReviews,
          hasNext: pageNum < Math.ceil(totalReviews / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching poem reviews:", error);
      res.status(500).json({
        success: false,
        message: "نظم کے جائزے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create a new review
   */
  static async createReview(req, res) {
    try {
      const { poemId, rating, comment, isAnonymous = false } = req.body;
      const userId = req.user.id;

      // Validation
      if (!poemId || !rating) {
        return res.status(400).json({
          success: false,
          message: "نظم ID اور ریٹنگ ضروری ہے",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(poemId)) {
        return res.status(400).json({
          success: false,
          message: "غلط نظم ID",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "ریٹنگ 1 سے 5 کے درمیان ہونی چاہیے",
        });
      }

      // Check if poem exists
      const poem = await Poem.findById(poemId);
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "نظم موجود نہیں",
        });
      }

      // Check if user is not the poem author
      if (poem.author.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: "آپ اپنی نظم کا جائزہ نہیں لے سکتے",
        });
      }

      // Check if user has already reviewed this poem
      const existingReview = await Review.findOne({
        poem: poemId,
        author: userId,
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "آپ پہلے ہی اس نظم کا جائزہ لے چکے ہیں",
        });
      }

      const review = new Review({
        poem: poemId,
        author: userId,
        rating: parseInt(rating),
        comment: comment?.trim() || "",
        isAnonymous,
      });

      await review.save();

      // Update poem's average rating
      await updatePoemRating(poemId);

      // Populate the review for response
      await review.populate(
        "author",
        "username profile.fullName profile.avatar"
      );
      await review.populate("poem", "title");

      res.status(201).json({
        success: true,
        message: "جائزہ کامیابی سے شامل کر دیا گیا",
        review,
      });
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({
        success: false,
        message: "جائزہ شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update a review
   */
  static async updateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { rating, comment, isAnonymous } = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: "غلط جائزہ ID",
        });
      }

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "جائزہ موجود نہیں",
        });
      }

      // Check if user is the review author
      if (review.author.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس جائزے میں تبدیلی کی اجازت نہیں",
        });
      }

      // Update fields
      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return res.status(400).json({
            success: false,
            message: "ریٹنگ 1 سے 5 کے درمیان ہونی چاہیے",
          });
        }
        review.rating = parseInt(rating);
      }

      if (comment !== undefined) {
        review.comment = comment.trim();
      }

      if (isAnonymous !== undefined) {
        review.isAnonymous = isAnonymous;
      }

      review.updatedAt = new Date();
      await review.save();

      // Update poem's average rating if rating changed
      if (rating !== undefined) {
        await updatePoemRating(review.poem);
      }

      await review.populate(
        "author",
        "username profile.fullName profile.avatar"
      );
      await review.populate("poem", "title");

      res.json({
        success: true,
        message: "جائزہ کامیابی سے اپ ڈیٹ ہوا",
        review,
      });
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({
        success: false,
        message: "جائزہ اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete a review
   */
  static async deleteReview(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: "غلط جائزہ ID",
        });
      }

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "جائزہ موجود نہیں",
        });
      }

      // Check authorization (review author or admin)
      if (review.author.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس جائزے کو ڈیلیٹ کرنے کی اجازت نہیں",
        });
      }

      const poemId = review.poem;
      await Review.findByIdAndDelete(reviewId);

      // Update poem's average rating
      await updatePoemRating(poemId);

      res.json({
        success: true,
        message: "جائزہ کامیابی سے ڈیلیٹ ہوا",
      });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({
        success: false,
        message: "جائزہ ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= REVIEW INTERACTIONS =============

  /**
   * Like/Unlike a review
   */
  static async toggleReviewLike(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: "غلط جائزہ ID",
        });
      }

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "جائزہ موجود نہیں",
        });
      }

      const isLiked = review.likes.includes(userId);

      if (isLiked) {
        // Unlike
        review.likes.pull(userId);
      } else {
        // Like
        review.likes.push(userId);
      }

      await review.save();

      res.json({
        success: true,
        message: isLiked ? "پسند ہٹا دیا گیا" : "پسند کیا گیا",
        likes: review.likes.length,
        isLiked: !isLiked,
      });
    } catch (error) {
      console.error("Error toggling review like:", error);
      res.status(500).json({
        success: false,
        message: "جائزے کو پسند کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Report a review
   */
  static async reportReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { reason, description } = req.body;
      const userId = req.user.id;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "رپورٹ کی وجہ ضروری ہے",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: "غلط جائزہ ID",
        });
      }

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "جائزہ موجود نہیں",
        });
      }

      // Check if user has already reported this review
      const existingReport = review.reports.find(
        (report) => report.reportedBy.toString() === userId
      );

      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: "آپ پہلے ہی اس جائزے کی رپورٹ کر چکے ہیں",
        });
      }

      review.reports.push({
        reportedBy: userId,
        reason,
        description: description || "",
        reportedAt: new Date(),
      });

      await review.save();

      res.json({
        success: true,
        message: "جائزے کی رپورٹ کامیابی سے جمع ہوئی",
      });
    } catch (error) {
      console.error("Error reporting review:", error);
      res.status(500).json({
        success: false,
        message: "جائزے کی رپورٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= ANALYTICS & STATISTICS =============

  /**
   * Get review statistics
   */
  static async getReviewStatistics(req, res) {
    try {
      const { poemId, authorId, dateRange = "30d" } = req.query;

      // Calculate date range
      let dateFilter = {};
      if (dateRange) {
        const days = parseInt(dateRange.replace("d", ""));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter.createdAt = { $gte: startDate };
      }

      // Build base query
      let baseQuery = { ...dateFilter };
      if (poemId && mongoose.Types.ObjectId.isValid(poemId)) {
        baseQuery.poem = new mongoose.Types.ObjectId(poemId);
      }
      if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
        baseQuery.author = new mongoose.Types.ObjectId(authorId);
      }

      const [
        totalReviews,
        averageRating,
        ratingDistribution,
        topReviewedPoems,
        mostActiveReviewers,
      ] = await Promise.all([
        Review.countDocuments(baseQuery),
        Review.aggregate([
          { $match: baseQuery },
          { $group: { _id: null, avgRating: { $avg: "$rating" } } },
        ]),
        Review.aggregate([
          { $match: baseQuery },
          { $group: { _id: "$rating", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Review.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: "$poem",
              count: { $sum: 1 },
              avgRating: { $avg: "$rating" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "poems",
              localField: "_id",
              foreignField: "_id",
              as: "poem",
            },
          },
          { $unwind: "$poem" },
        ]),
        Review.aggregate([
          { $match: baseQuery },
          { $group: { _id: "$author", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
        ]),
      ]);

      const statistics = {
        overview: {
          totalReviews,
          averageRating: averageRating[0]?.avgRating
            ? Math.round(averageRating[0].avgRating * 10) / 10
            : 0,
        },
        ratingDistribution: ratingDistribution.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        ),
        topReviewedPoems: topReviewedPoems.map((item) => ({
          poem: {
            id: item.poem._id,
            title: item.poem.title,
          },
          reviewCount: item.count,
          averageRating: Math.round(item.avgRating * 10) / 10,
        })),
        mostActiveReviewers: mostActiveReviewers.map((item) => ({
          author: {
            id: item.author._id,
            username: item.author.username,
            fullName: item.author.profile?.fullName,
          },
          reviewCount: item.count,
        })),
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching review statistics:", error);
      res.status(500).json({
        success: false,
        message: "جائزوں کے اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's review history
   */
  static async getUserReviewHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const currentUserId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      // Check if user can view this history
      if (currentUserId !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس صارف کی تاریخ دیکھنے کی اجازت نہیں",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const reviews = await Review.find({ author: userId })
        .populate("poem", "title author")
        .populate("poem.author", "username profile.fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalReviews = await Review.countDocuments({ author: userId });

      // Get user's review statistics
      const userStats = await Review.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            ratingDistribution: { $push: "$rating" },
          },
        },
      ]);

      let statistics = {
        totalReviews: 0,
        averageRating: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

      if (userStats.length > 0) {
        const stats = userStats[0];
        statistics.totalReviews = stats.totalReviews;
        statistics.averageRating = Math.round(stats.averageRating * 10) / 10;

        stats.ratingDistribution.forEach((rating) => {
          statistics.distribution[rating]++;
        });
      }

      res.json({
        success: true,
        reviews,
        statistics,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalReviews / limitNum),
          totalReviews,
          hasNext: pageNum < Math.ceil(totalReviews / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching user review history:", error);
      res.status(500).json({
        success: false,
        message: "صارف کی جائزہ تاریخ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= MODERATION =============

  /**
   * Get reported reviews (Admin/Moderator only)
   */
  static async getReportedReviews(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const reportedReviews = await Review.find({
        "reports.0": { $exists: true }, // Has at least one report
      })
        .populate("author", "username profile.fullName")
        .populate("poem", "title")
        .populate("reports.reportedBy", "username")
        .sort({ "reports.reportedAt": -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalReported = await Review.countDocuments({
        "reports.0": { $exists: true },
      });

      res.json({
        success: true,
        reviews: reportedReviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalReported / limitNum),
          totalReported,
          hasNext: pageNum < Math.ceil(totalReported / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching reported reviews:", error);
      res.status(500).json({
        success: false,
        message: "رپورٹ شدہ جائزے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

// Helper function to update poem's average rating
async function updatePoemRating(poemId) {
  try {
    const ratingStats = await Review.aggregate([
      { $match: { poem: new mongoose.Types.ObjectId(poemId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const avgRating = ratingStats.length > 0 ? ratingStats[0].averageRating : 0;
    const reviewCount =
      ratingStats.length > 0 ? ratingStats[0].totalReviews : 0;

    await Poem.findByIdAndUpdate(poemId, {
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount,
    });
  } catch (error) {
    console.error("Error updating poem rating:", error);
  }
}

export default ReviewController;
