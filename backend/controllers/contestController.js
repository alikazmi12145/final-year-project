import Contest from "../models/Contest.js";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import mongoose from "mongoose";

/**
 * Contest Controller for Bazm-E-Sukhan Platform
 * Handles poetry contests, competitions, submissions, and judging
 */

class ContestController {
  // ============= CONTEST MANAGEMENT =============

  /**
   * Get all contests with filtering and pagination
   */
  static async getAllContests(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        status,
        category,
        type,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = {};

      if (status && status !== "all") {
        if (status === "active") {
          query = {
            status: "active",
            submissionStartDate: { $lte: new Date() },
            submissionEndDate: { $gte: new Date() },
          };
        } else if (status === "upcoming") {
          query = {
            status: "active",
            submissionStartDate: { $gt: new Date() },
          };
        } else if (status === "ended") {
          query = {
            $or: [
              { status: "completed" },
              { submissionEndDate: { $lt: new Date() } },
            ],
          };
        } else {
          query.status = status;
        }
      }

      if (category && category !== "all") {
        query.category = category;
      }

      if (type && type !== "all") {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { theme: { $regex: search, $options: "i" } },
        ];
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const contests = await Contest.find(query)
        .populate("organizer", "username profile.fullName")
        .populate("judges.judge", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const totalContests = await Contest.countDocuments(query);

      // Add submission counts to each contest
      const contestsWithCounts = contests.map((contest) => ({
        ...contest.toObject(),
        submissionCount: contest.submissions.length,
        isActive:
          contest.status === "active" &&
          new Date() >= contest.submissionStartDate &&
          new Date() <= contest.submissionEndDate,
      }));

      res.json({
        success: true,
        contests: contestsWithCounts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalContests / limitNum),
          totalContests,
          hasNext: pageNum < Math.ceil(totalContests / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({
        success: false,
        message: "مقابلے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get single contest by ID with detailed information
   */
  static async getContestById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط مقابلہ ID",
        });
      }

      const contest = await Contest.findById(id)
        .populate("organizer", "username profile.fullName")
        .populate("judges.judge", "username profile.fullName")
        .populate("submissions.participant", "username profile.fullName")
        .populate("submissions.poem", "title content category");

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      // Check if user has already submitted
      let hasSubmitted = false;
      let userSubmission = null;

      if (userId) {
        userSubmission = contest.submissions.find(
          (sub) => sub.participant._id.toString() === userId
        );
        hasSubmitted = !!userSubmission;
      }

      // Determine contest status
      const now = new Date();
      let contestStatus = "upcoming";

      if (
        now >= contest.submissionStartDate &&
        now <= contest.submissionEndDate
      ) {
        contestStatus = "active";
      } else if (now > contest.submissionEndDate) {
        contestStatus = "ended";
      }

      // Hide other submissions if contest is still active (unless user is judge/organizer)
      let submissions = contest.submissions;
      const isJudgeOrOrganizer =
        userId &&
        (contest.organizer._id.toString() === userId ||
          contest.judges.some((j) => j.judge._id.toString() === userId));

      if (contestStatus === "active" && !isJudgeOrOrganizer) {
        submissions = userSubmission ? [userSubmission] : [];
      }

      res.json({
        success: true,
        contest: {
          ...contest.toObject(),
          submissions,
          submissionCount: contest.submissions.length,
          contestStatus,
          hasSubmitted,
          userSubmission,
        },
      });
    } catch (error) {
      console.error("Error fetching contest:", error);
      res.status(500).json({
        success: false,
        message: "مقابلہ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new contest (Admin/Organizer only)
   */
  static async createContest(req, res) {
    try {
      const {
        title,
        description,
        theme,
        category,
        type = "public",
        submissionStartDate,
        submissionEndDate,
        judgingEndDate,
        resultAnnouncementDate,
        rules,
        guidelines,
        prizes,
        judgesCriteria,
        maxSubmissions = 1,
        allowAnonymous = false,
        entryFee = 0,
        judges,
      } = req.body;

      // Validate required fields
      if (
        !title ||
        !description ||
        !submissionStartDate ||
        !submissionEndDate
      ) {
        return res.status(400).json({
          success: false,
          message: "ضروری معلومات مکمل کریں",
        });
      }

      // Validate dates
      const startDate = new Date(submissionStartDate);
      const endDate = new Date(submissionEndDate);
      const judgingEnd = judgingEndDate ? new Date(judgingEndDate) : null;
      const resultDate = resultAnnouncementDate
        ? new Date(resultAnnouncementDate)
        : null;

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: "اختتام کی تاریخ شروع کی تاریخ سے بعد ہونی چاہیے",
        });
      }

      const contest = new Contest({
        title: title.trim(),
        description: description.trim(),
        theme: theme?.trim(),
        category,
        type,
        organizer: req.user.id,
        submissionStartDate: startDate,
        submissionEndDate: endDate,
        judgingEndDate: judgingEnd,
        resultAnnouncementDate: resultDate,
        rules: rules || [],
        guidelines: guidelines?.trim(),
        prizes: prizes || [],
        judgesCriteria: judgesCriteria || [],
        maxSubmissions,
        allowAnonymous,
        entryFee,
        judges:
          judges?.map((judgeId) => ({
            judge: judgeId,
            assignedAt: new Date(),
          })) || [],
        status: "active",
      });

      await contest.save();

      await contest.populate([
        { path: "organizer", select: "username profile.fullName" },
        { path: "judges.judge", select: "username profile.fullName" },
      ]);

      res.status(201).json({
        success: true,
        message: "مقابلہ کامیابی سے بنایا گیا",
        contest,
      });
    } catch (error) {
      console.error("Error creating contest:", error);
      res.status(500).json({
        success: false,
        message: "مقابلہ بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update contest (Organizer/Admin only)
   */
  static async updateContest(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط مقابلہ ID",
        });
      }

      const contest = await Contest.findById(id);

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      // Check authorization
      if (
        contest.organizer.toString() !== userId &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "اس مقابلہ میں تبدیلی کی اجازت نہیں",
        });
      }

      // Update fields
      const allowedFields = [
        "title",
        "description",
        "theme",
        "category",
        "type",
        "submissionStartDate",
        "submissionEndDate",
        "judgingEndDate",
        "resultAnnouncementDate",
        "rules",
        "guidelines",
        "prizes",
        "judgesCriteria",
        "maxSubmissions",
        "allowAnonymous",
        "entryFee",
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          contest[field] = updateData[field];
        }
      });

      // Handle judges update
      if (updateData.judges) {
        contest.judges = updateData.judges.map((judgeId) => ({
          judge: judgeId,
          assignedAt: new Date(),
        }));
      }

      contest.updatedAt = new Date();
      await contest.save();

      await contest.populate([
        { path: "organizer", select: "username profile.fullName" },
        { path: "judges.judge", select: "username profile.fullName" },
      ]);

      res.json({
        success: true,
        message: "مقابلہ کامیابی سے اپ ڈیٹ ہوا",
        contest,
      });
    } catch (error) {
      console.error("Error updating contest:", error);
      res.status(500).json({
        success: false,
        message: "مقابلہ اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= SUBMISSION MANAGEMENT =============

  /**
   * Submit poem to contest
   */
  static async submitToContest(req, res) {
    try {
      const { contestId } = req.params;
      const { poemId, additionalNotes, isAnonymous = false } = req.body;
      const userId = req.user.id;

      if (
        !mongoose.Types.ObjectId.isValid(contestId) ||
        !mongoose.Types.ObjectId.isValid(poemId)
      ) {
        return res.status(400).json({
          success: false,
          message: "غلط ID",
        });
      }

      // Get contest
      const contest = await Contest.findById(contestId);

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      // Check if contest is active and within submission period
      const now = new Date();
      if (
        contest.status !== "active" ||
        now < contest.submissionStartDate ||
        now > contest.submissionEndDate
      ) {
        return res.status(400).json({
          success: false,
          message: "مقابلے کی آخری تاریخ گزر گئی یا ابھی شروع نہیں ہوا",
        });
      }

      // Check if user already submitted
      const existingSubmission = contest.submissions.find(
        (sub) => sub.participant.toString() === userId
      );

      if (existingSubmission && contest.maxSubmissions === 1) {
        return res.status(400).json({
          success: false,
          message: "آپ نے پہلے سے اس مقابلے میں حصہ لیا ہے",
        });
      }

      // Check max submissions limit
      const userSubmissions = contest.submissions.filter(
        (sub) => sub.participant.toString() === userId
      );

      if (userSubmissions.length >= contest.maxSubmissions) {
        return res.status(400).json({
          success: false,
          message: `آپ صرف ${contest.maxSubmissions} مرتبہ حصہ لے سکتے ہیں`,
        });
      }

      // Verify poem exists and belongs to user
      const poem = await Poem.findOne({ _id: poemId, author: userId });

      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری موجود نہیں یا آپ کی نہیں",
        });
      }

      // Add submission
      contest.submissions.push({
        participant: userId,
        poem: poemId,
        submittedAt: new Date(),
        additionalNotes: additionalNotes || "",
        isAnonymous,
      });

      await contest.save();

      res.json({
        success: true,
        message: "مقابلے میں کامیابی سے حصہ لیا",
        submission: {
          contest: contest.title,
          poem: poem.title,
          submittedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error submitting to contest:", error);
      res.status(500).json({
        success: false,
        message: "مقابلے میں حصہ لیتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Withdraw submission from contest
   */
  static async withdrawSubmission(req, res) {
    try {
      const { contestId, submissionId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(contestId)) {
        return res.status(400).json({
          success: false,
          message: "غلط مقابلہ ID",
        });
      }

      const contest = await Contest.findById(contestId);

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      // Check if withdrawal is allowed (before judging starts)
      const now = new Date();
      if (contest.judgingEndDate && now >= contest.judgingEndDate) {
        return res.status(400).json({
          success: false,
          message: "ججنگ شروع ہونے کے بعد واپسی کی اجازت نہیں",
        });
      }

      // Find and remove submission
      const submissionIndex = contest.submissions.findIndex(
        (sub) =>
          sub._id.toString() === submissionId &&
          sub.participant.toString() === userId
      );

      if (submissionIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "جمع کردہ شاعری موجود نہیں",
        });
      }

      contest.submissions.splice(submissionIndex, 1);
      await contest.save();

      res.json({
        success: true,
        message: "شاعری کامیابی سے واپس لی گئی",
      });
    } catch (error) {
      console.error("Error withdrawing submission:", error);
      res.status(500).json({
        success: false,
        message: "شاعری واپس لیتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= JUDGING SYSTEM =============

  /**
   * Submit scores for contest submissions (Judges only)
   */
  static async submitScores(req, res) {
    try {
      const { contestId } = req.params;
      const { scores } = req.body; // Array of { submissionId, scores, comments }
      const judgeId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(contestId)) {
        return res.status(400).json({
          success: false,
          message: "غلط مقابلہ ID",
        });
      }

      const contest = await Contest.findById(contestId);

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      // Check if user is a judge
      const isJudge = contest.judges.some(
        (j) => j.judge.toString() === judgeId
      );

      if (!isJudge && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "صرف جج اسکور دے سکتے ہیں",
        });
      }

      // Check if judging period is active
      const now = new Date();
      if (now <= contest.submissionEndDate) {
        return res.status(400).json({
          success: false,
          message: "ابھی ججنگ کا وقت نہیں آیا",
        });
      }

      // Update scores for each submission
      scores.forEach((scoreData) => {
        const submission = contest.submissions.find(
          (sub) => sub._id.toString() === scoreData.submissionId
        );

        if (submission) {
          // Remove existing score from this judge
          submission.scores = submission.scores.filter(
            (score) => score.judge.toString() !== judgeId
          );

          // Add new score
          submission.scores.push({
            judge: judgeId,
            scores: scoreData.scores, // Object with criteria scores
            comments: scoreData.comments || "",
            submittedAt: new Date(),
          });

          // Calculate average score
          const totalScores = submission.scores.reduce((sum, score) => {
            const criteriaScores = Object.values(score.scores);
            const avgCriteriaScore =
              criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length;
            return sum + avgCriteriaScore;
          }, 0);

          submission.averageScore = totalScores / submission.scores.length;
        }
      });

      await contest.save();

      res.json({
        success: true,
        message: "اسکور کامیابی سے جمع ہوا",
      });
    } catch (error) {
      console.error("Error submitting scores:", error);
      res.status(500).json({
        success: false,
        message: "اسکور جمع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get contest results
   */
  static async getContestResults(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط مقابلہ ID",
        });
      }

      const contest = await Contest.findById(id)
        .populate("submissions.participant", "username profile.fullName")
        .populate("submissions.poem", "title content category")
        .populate("submissions.scores.judge", "username profile.fullName");

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "مقابلہ موجود نہیں",
        });
      }

      // Check if results should be visible
      const now = new Date();
      const resultsVisible = contest.resultAnnouncementDate
        ? now >= contest.resultAnnouncementDate
        : contest.status === "completed";

      if (!resultsVisible && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "نتائج ابھی اعلان نہیں ہوئے",
        });
      }

      // Sort submissions by average score
      const sortedSubmissions = contest.submissions
        .filter((sub) => sub.averageScore !== undefined)
        .sort((a, b) => b.averageScore - a.averageScore);

      // Add rankings
      const results = sortedSubmissions.map((submission, index) => ({
        ...submission.toObject(),
        rank: index + 1,
        prize: contest.prizes[index] || null,
      }));

      res.json({
        success: true,
        contest: {
          _id: contest._id,
          title: contest.title,
          description: contest.description,
          category: contest.category,
          status: contest.status,
          resultAnnouncementDate: contest.resultAnnouncementDate,
        },
        results,
        totalSubmissions: contest.submissions.length,
        judgedSubmissions: sortedSubmissions.length,
      });
    } catch (error) {
      console.error("Error fetching contest results:", error);
      res.status(500).json({
        success: false,
        message: "مقابلے کے نتائج حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= USER-SPECIFIC FUNCTIONS =============

  /**
   * Get user's contest submissions
   */
  static async getUserSubmissions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {
        "submissions.participant": userId,
      };

      if (status && status !== "all") {
        query.status = status;
      }

      const contests = await Contest.find(query)
        .populate("submissions.poem", "title content category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      // Filter to only include user's submissions
      const userContests = contests.map((contest) => ({
        ...contest.toObject(),
        submissions: contest.submissions.filter(
          (sub) => sub.participant.toString() === userId
        ),
      }));

      const totalContests = await Contest.countDocuments(query);

      res.json({
        success: true,
        contests: userContests,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalContests / limitNum),
          totalContests,
          hasNext: pageNum < Math.ceil(totalContests / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({
        success: false,
        message: "آپ کی جمع کردہ شاعری حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get contests available for user to participate
   */
  static async getAvailableContests(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, category } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {
        status: "active",
        submissionStartDate: { $lte: new Date() },
        submissionEndDate: { $gte: new Date() },
      };

      if (category && category !== "all") {
        query.category = category;
      }

      const contests = await Contest.find(query)
        .populate("organizer", "username profile.fullName")
        .sort({ submissionEndDate: 1 })
        .skip(skip)
        .limit(limitNum);

      // Add user submission status
      const contestsWithStatus = contests.map((contest) => {
        let hasSubmitted = false;
        let submissionCount = 0;

        if (userId) {
          const userSubmissions = contest.submissions.filter(
            (sub) => sub.participant.toString() === userId
          );
          hasSubmitted = userSubmissions.length > 0;
          submissionCount = userSubmissions.length;
        }

        return {
          ...contest.toObject(),
          hasSubmitted,
          userSubmissionCount: submissionCount,
          totalSubmissions: contest.submissions.length,
          daysLeft: Math.ceil(
            (contest.submissionEndDate - new Date()) / (1000 * 60 * 60 * 24)
          ),
        };
      });

      const totalContests = await Contest.countDocuments(query);

      res.json({
        success: true,
        contests: contestsWithStatus,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalContests / limitNum),
          totalContests,
          hasNext: pageNum < Math.ceil(totalContests / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching available contests:", error);
      res.status(500).json({
        success: false,
        message: "دستیاب مقابلے حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= STATISTICS & ANALYTICS =============

  /**
   * Get contest statistics
   */
  static async getContestStatistics(req, res) {
    try {
      const [
        totalContests,
        activeContests,
        completedContests,
        totalSubmissions,
        totalParticipants,
      ] = await Promise.all([
        Contest.countDocuments(),
        Contest.countDocuments({
          status: "active",
          submissionStartDate: { $lte: new Date() },
          submissionEndDate: { $gte: new Date() },
        }),
        Contest.countDocuments({ status: "completed" }),
        Contest.aggregate([
          { $group: { _id: null, total: { $sum: { $size: "$submissions" } } } },
        ]),
        Contest.aggregate([
          { $unwind: "$submissions" },
          { $group: { _id: "$submissions.participant" } },
          { $count: "totalParticipants" },
        ]),
      ]);

      // Get category distribution
      const categoryStats = await Contest.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const statistics = {
        overview: {
          totalContests,
          activeContests,
          completedContests,
          totalSubmissions: totalSubmissions[0]?.total || 0,
          totalParticipants: totalParticipants[0]?.totalParticipants || 0,
        },
        categoryDistribution: categoryStats,
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching contest statistics:", error);
      res.status(500).json({
        success: false,
        message: "مقابلوں کے اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default ContestController;
