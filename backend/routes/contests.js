import express from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import Contest from "../models/Contest.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import FeedbackController from "../controllers/feedbackController.js";
import { auth, adminAuth, moderatorAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting
const contestOperationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

// Get all contests (public)
router.get("/", contestOperationLimit, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { theme: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Auto-update expired contests before fetching
    const now = new Date();
    await Contest.updateMany(
      {
        status: { $in: ['active', 'submission_open', 'registration_open', 'upcoming'] },
        submissionEnd: { $lt: now },
        votingStart: { $exists: true, $lte: now }
      },
      { $set: { status: 'voting' } }
    );
    await Contest.updateMany(
      {
        status: { $in: ['active', 'submission_open', 'registration_open', 'upcoming'] },
        submissionEnd: { $lt: now },
        $or: [
          { votingStart: { $exists: false } },
          { votingStart: null },
          { votingEnd: { $lt: now } }
        ]
      },
      { $set: { status: 'completed' } }
    );
    await Contest.updateMany(
      {
        status: 'voting',
        votingEnd: { $lt: now }
      },
      { $set: { status: 'completed' } }
    );

    const contests = await Contest.find(query)
      .populate('organizer', 'name email profileImage role')
      .populate('judges.user', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Contest.countDocuments(query);

    // Add participation status for authenticated users
    const contestsWithStatus = contests.map(contest => {
      const userParticipation = req.user ? 
        contest.participants?.find(p => p.user?.toString() === req.user?.userId) : 
        null;
      const userSubmission = req.user
        ? contest.submissions?.find(
            s => s.participant?.toString() === req.user?.userId
          )
        : null;

      return {
        ...contest,
        userHasParticipated: !!userParticipation,
        userSubmission: userSubmission || null,
        timeRemaining: contest.submissionEnd ? 
          Math.max(0, new Date(contest.submissionEnd) - new Date()) : null
      };
    });

    res.json({
      success: true,
      contests: contestsWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories: await Contest.distinct('category'),
        statuses: ['upcoming', 'active', 'judging', 'completed']
      }
    });
  } catch (error) {
    console.error("Get contests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contests"
    });
  }
});

// Get contest by ID
router.get("/:id", contestOperationLimit, async (req, res) => {
  try {
    // Auto-update status for this contest if expired
    const now = new Date();
    const contestDoc = await Contest.findById(req.params.id);
    if (contestDoc) {
      const activeStatuses = ['active', 'submission_open', 'registration_open', 'upcoming'];
      if (activeStatuses.includes(contestDoc.status) && contestDoc.submissionEnd && contestDoc.submissionEnd < now) {
        if (contestDoc.votingEnd && contestDoc.votingEnd < now) {
          contestDoc.status = 'completed';
        } else if (contestDoc.votingStart && contestDoc.votingStart <= now) {
          contestDoc.status = 'voting';
        } else {
          contestDoc.status = 'completed';
        }
        await contestDoc.save();
      } else if (contestDoc.status === 'voting' && contestDoc.votingEnd && contestDoc.votingEnd < now) {
        contestDoc.status = 'completed';
        await contestDoc.save();
      }
    }

    const contest = await Contest.findById(req.params.id)
      .populate('organizer', 'name email profileImage role')
      .populate('judges.user', 'name email role')
      .populate('participants.user', 'name email role isVerified')
      .populate('submissions.participant', 'name email role isVerified')
      .populate('submissions.poem', 'title content category createdAt')
      .populate('results.participant', 'name email role')
      .populate('results.submission', 'title content')
      .populate('winner', 'name email role')
      .lean();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // Check user participation
    const userParticipation = req.user ? 
      contest.participants?.find(p => p.user?._id?.toString() === req.user?.userId) : 
      null;
    const userSubmission = req.user
      ? contest.submissions?.find(
          s => s.participant?._id?.toString() === req.user?.userId
        )
      : null;

    // Calculate contest metrics
    const metrics = {
      totalParticipants: contest.participants?.length || 0,
      totalSubmissions: contest.submissions?.length || 0,
      averageRating: 0,
      timeRemaining: contest.submissionEnd ? 
        Math.max(0, new Date(contest.submissionEnd) - new Date()) : null,
      daysRemaining: contest.submissionEnd ? 
        Math.max(0, Math.ceil((new Date(contest.submissionEnd) - new Date()) / (1000 * 60 * 60 * 24))) : 
        null
    };

    res.json({
      success: true,
      contest: {
        ...contest,
        userHasParticipated: !!userParticipation,
        userSubmission: userSubmission || null,
        userCanVote: req.user && contest.status === 'voting' && !userParticipation,
        canSubmit: (contest.status === 'active' || contest.status === 'submission_open') && 
                   contest.submissionEnd && new Date() < new Date(contest.submissionEnd) && 
                   !userParticipation
      },
      metrics
    });
  } catch (error) {
    console.error("Get contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contest"
    });
  }
});

// Create new contest (admin/moderator only)
router.post("/", moderatorAuth, [
  body("title").isLength({ min: 5, max: 200 }).trim(),
  body("description").isLength({ min: 20, max: 2000 }).trim(),
  body("category").isIn([
    "ghazal", "nazm", "rubai", "free-verse", "all"
  ]),
  body("theme").isLength({ min: 1, max: 100 }).trim(),
  body("rules").isArray({ min: 1, max: 20 }),
  body("prizes").optional().isArray({ max: 10 }),
  body("submissionDeadline").isISO8601(),
  body("votingDeadline").optional().isISO8601(),
  body("maxParticipants").optional().isInt({ min: 10, max: 10000 }),
  body("entryFee").optional().isNumeric({ min: 0 }),
  body("language").optional().isIn(["urdu", "punjabi", "arabic", "persian"])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const {
      title, description, category, theme, rules, prizes,
      submissionDeadline, votingDeadline, maxParticipants,
      entryFee, language = "urdu", judges
    } = req.body;

    // Validate dates
    const subDeadline = new Date(submissionDeadline);
    const voteDeadline = votingDeadline ? new Date(votingDeadline) : null;

    if (subDeadline <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "جمع کرانے کی آخری تاریخ مستقبل میں ہونی چاہیے"
      });
    }

    if (voteDeadline && voteDeadline <= subDeadline) {
      return res.status(400).json({
        success: false,
        message: "ووٹنگ کی تاریخ جمع کرانے کی تاریخ کے بعد ہونی چاہیے"
      });
    }

    // Build timeline: registration opens now, submission until deadline, voting after
    const now = new Date();
    const contestData = {
      title,
      description,
      category,
      theme,
      rules,
      organizer: req.user.userId,
      status: "upcoming",
      // Timeline - map single deadline to required schema fields
      registrationStart: now,
      registrationEnd: subDeadline,
      submissionStart: now,
      submissionEnd: subDeadline,
    };

    if (voteDeadline) {
      contestData.votingStart = subDeadline;
      contestData.votingEnd = voteDeadline;
      contestData.resultDate = voteDeadline;
    }

    if (maxParticipants) contestData.maxParticipants = maxParticipants;
    if (entryFee) contestData.entryFee = { amount: Number(entryFee), currency: "PKR" };
    if (judges && judges.length) {
      contestData.judges = judges.map(j => ({ user: j }));
    }

    // Map prizes to match schema enum for position
    if (prizes && prizes.length) {
      const positionMap = { "1": "1st", "2": "2nd", "3": "3rd" };
      contestData.prizes = prizes.map((p, i) => ({
        position: positionMap[String(i + 1)] || "special",
        title: p.position || `Position ${i + 1}`,
        description: p.reward || p.description || "",
        prize: p.reward || p.prize || "",
        monetaryValue: p.monetaryValue || 0,
      }));
    }

    const contest = new Contest(contestData);

    await contest.save();
    await contest.populate('organizer', 'name email profileImage role');

    res.status(201).json({
      success: true,
      message: "مقابلہ کامیابی سے بنایا گیا",
      contest
    });
  } catch (error) {
    console.error("Create contest error:", error);
    res.status(500).json({
      success: false,
      message: "مقابلہ بنانے میں خرابی: " + error.message
    });
  }
});

// Participate in contest
router.post("/:id/participate", auth, contestOperationLimit, async (req, res) => {
  try {
    const { poemId, title, content, isNew } = req.body;

    // Must provide either an existing poem or new poem data
    if (!poemId && (!isNew || !title || !content)) {
      return res.status(400).json({
        success: false,
        message: "شاعری منتخب کریں یا نئی شاعری لکھیں"
      });
    }

    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "مقابلہ نہیں ملا"
      });
    }

    // Check contest status - allow active, upcoming, submission_open, registration_open
    const allowedStatuses = ['active', 'upcoming', 'submission_open', 'registration_open'];
    if (!allowedStatuses.includes(contest.status)) {
      return res.status(400).json({
        success: false,
        message: "اس مقابلے میں فی الحال اندراج نہیں ہو سکتا"
      });
    }

    // Check submission deadline
    if (contest.submissionEnd && new Date() > new Date(contest.submissionEnd)) {
      return res.status(400).json({
        success: false,
        message: "جمع کرانے کی آخری تاریخ گزر چکی ہے"
      });
    }

    // Check if user already participated
    const existingParticipation = contest.participants?.find(
      p => p.user?.toString() === req.user.userId
    );

    if (existingParticipation) {
      return res.status(400).json({
        success: false,
        message: "آپ پہلے سے اس مقابلے میں شامل ہیں"
      });
    }

    // Check max participants
    if (contest.maxParticipants && (contest.participants?.length || 0) >= contest.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "مقابلے میں زیادہ سے زیادہ شرکاء ہو چکے ہیں"
      });
    }

    let poem;

    if (isNew && title && content) {
      // Create new poem for this submission
      poem = new Poem({
        title: title.trim(),
        content: content.trim(),
        author: req.user.userId,
        category: contest.category !== 'all' ? contest.category : 'ghazal',
        status: 'published',
      });
      await poem.save();
    } else {
      // Use existing poem
      poem = await Poem.findById(poemId);
      
      if (!poem) {
        return res.status(404).json({
          success: false,
          message: "شاعری نہیں ملی"
        });
      }

      if (poem.author.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "آپ صرف اپنی شاعری جمع کرا سکتے ہیں"
        });
      }
    }

    // Add participant
    contest.participants.push({
      user: req.user.userId,
      registeredAt: new Date(),
    });

    // Add submission
    contest.submissions.push({
      participant: req.user.userId,
      poem: poem._id,
      submittedAt: new Date(),
      status: 'submitted',
    });

    await contest.save();

    res.status(201).json({
      success: true,
      message: "شاعری کامیابی سے جمع ہو گئی!",
      poem: { _id: poem._id, title: poem.title },
    });
  } catch (error) {
    console.error("Participate in contest error:", error);
    res.status(500).json({
      success: false,
      message: "شاعری جمع کرانے میں خرابی: " + error.message
    });
  }
});

// Vote for submission (if public voting is enabled)
router.post("/:id/vote", auth, contestOperationLimit, [
  body("participantId").isMongoId(),
  body("rating").isInt({ min: 1, max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest id"
      });
    }

    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // Check if contest allows public voting
    if (contest.votingType !== 'public' || contest.status !== 'voting') {
      return res.status(400).json({
        success: false,
        message: "Voting is not available for this contest"
      });
    }

    // Check voting deadline
    if (contest.votingEnd && new Date() > new Date(contest.votingEnd)) {
      return res.status(400).json({
        success: false,
        message: "Voting deadline has passed"
      });
    }

    // Check if user participated (participants can't vote)
    const userParticipated = contest.participants.some(
      p => p.user.toString() === req.user.userId
    );

    if (userParticipated) {
      return res.status(400).json({
        success: false,
        message: "Participants cannot vote in the contest"
      });
    }

    // Find participant
    const participant = contest.participants.find(
      p =>
        p._id?.toString() === req.body.participantId ||
        p.user?.toString() === req.body.participantId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found"
      });
    }

    const submission = contest.submissions.find(
      s => s.participant?.toString() === participant.user?.toString()
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found for participant"
      });
    }

    // Prevent users from voting for their own submission
    if (submission.participant?.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot vote for your own submission"
      });
    }

    // Check if user already voted for this submission
    const existingVote = (contest.votes || []).find(
      v =>
        v.voter?.toString() === req.user.userId &&
        v.submission?.toString() === submission.poem?.toString()
    );

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: "You have already voted for this submission"
      });
    }

    // Add vote
    contest.votes.push({
      voter: req.user.userId,
      submission: submission.poem,
      score: req.body.rating,
      votedAt: new Date()
    });

    contest.analytics = contest.analytics || {};
    contest.analytics.votes = (contest.analytics.votes || 0) + 1;

    await contest.save();

    res.json({
      success: true,
      message: "Vote submitted successfully"
    });
  } catch (error) {
    console.error("Vote for contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit vote"
    });
  }
});

// Get contest leaderboard
router.get("/:id/leaderboard", contestOperationLimit, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contest id"
      });
    }

    const contest = await Contest.findById(req.params.id)
      .populate('participants.user', 'name isVerified')
      .populate('submissions.participant', 'name isVerified')
      .populate('submissions.poem', 'title category createdAt')
      .lean();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    const votesByPoem = new Map();
    (contest.votes || []).forEach(vote => {
      const key = vote.submission?.toString();
      if (!key) return;
      const existing = votesByPoem.get(key) || { total: 0, count: 0 };
      votesByPoem.set(key, {
        total: existing.total + (vote.score || 0),
        count: existing.count + 1
      });
    });

    const participantByUserId = new Map(
      (contest.participants || []).map(p => [p.user?._id?.toString(), p.user])
    );

    const leaderboard = (contest.submissions || [])
      .filter(sub => sub.poem)
      .map(submission => {
        const poemId = submission.poem?._id?.toString() || submission.poem?.toString();
        const stats = votesByPoem.get(poemId) || { total: 0, count: 0 };
        const rating = stats.count > 0 ? stats.total / stats.count : 0;
        const user = submission.participant || participantByUserId.get(submission.participant?.toString());

        return {
          user,
          submission: submission.poem,
          rating,
          votesCount: stats.count,
          submittedAt: submission.submittedAt
        };
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        if (b.votesCount !== a.votesCount) {
          return b.votesCount - a.votesCount;
        }
        return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
      })
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

    res.json({
      success: true,
      leaderboard,
      contest: {
        id: contest._id,
        title: contest.title,
        status: contest.status,
        totalParticipants: (contest.participants || []).length
      }
    });
  } catch (error) {
    console.error("Get contest leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contest leaderboard"
    });
  }
});

// Submit feedback for a contest (authenticated)
router.post("/:id/feedback", auth, (req, res) => {
  req.body.targetType = "contest";
  req.body.targetId = req.params.id;
  return FeedbackController.submitFeedback(req, res);
});

// Get feedback for a contest (public)
router.get("/:id/feedback", contestOperationLimit, (req, res) => {
  req.params.targetType = "contest";
  req.params.targetId = req.params.id;
  return FeedbackController.getFeedback(req, res);
});

// ====== ADMIN GRADING ENDPOINTS ======

// Grade a submission (admin only)
router.put("/:id/submissions/:submissionIndex/grade", adminAuth, [
  body("score").isFloat({ min: 0, max: 100 }).withMessage("Score must be between 0 and 100"),
  body("creativity").optional().isFloat({ min: 0, max: 10 }),
  body("language").optional().isFloat({ min: 0, max: 10 }),
  body("theme").optional().isFloat({ min: 0, max: 10 }),
  body("structure").optional().isFloat({ min: 0, max: 10 }),
  body("impact").optional().isFloat({ min: 0, max: 10 }),
  body("feedback").optional().isString().trim(),
  body("status").optional().isIn(["submitted", "under_review", "qualified", "disqualified"]),
], async (req, res) => {
  try {
    console.log("Grade endpoint hit, user:", req.user?._id, req.user?.role);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id, submissionIndex } = req.params;
    const { score, creativity, language, theme, structure, impact, feedback, status } = req.body;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ success: false, message: "Contest not found" });
    }

    const idx = parseInt(submissionIndex);
    if (idx < 0 || idx >= contest.submissions.length) {
      return res.status(400).json({ success: false, message: "Invalid submission index" });
    }

    // Update grade
    contest.submissions[idx].grade = {
      score,
      creativity: creativity || 0,
      language: language || 0,
      theme: theme || 0,
      structure: structure || 0,
      impact: impact || 0,
      feedback: feedback || "",
      gradedBy: req.user.userId,
      gradedAt: new Date()
    };

    // Update submission status if provided
    if (status) {
      contest.submissions[idx].status = status;
    }

    await contest.save();

    // Return updated contest with populated fields
    const updated = await Contest.findById(id)
      .populate('participants.user', 'name email role isVerified')
      .populate('submissions.participant', 'name email role isVerified')
      .populate('submissions.poem', 'title content category createdAt')
      .populate('submissions.grade.gradedBy', 'name')
      .populate('results.participant', 'name email role')
      .lean();

    res.json({
      success: true,
      message: "درجہ بندی کامیابی سے محفوظ ہو گئی",
      contest: updated
    });
  } catch (error) {
    console.error("Grade submission error:", error);
    res.status(500).json({ success: false, message: "درجہ بندی میں خرابی: " + error.message });
  }
});

// Update submission status (admin only)
router.put("/:id/submissions/:submissionIndex/status", adminAuth, [
  body("status").isIn(["submitted", "under_review", "qualified", "disqualified"]).withMessage("Invalid status"),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id, submissionIndex } = req.params;
    const { status } = req.body;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ success: false, message: "Contest not found" });
    }

    const idx = parseInt(submissionIndex);
    if (idx < 0 || idx >= contest.submissions.length) {
      return res.status(400).json({ success: false, message: "Invalid submission index" });
    }

    contest.submissions[idx].status = status;
    await contest.save();

    res.json({
      success: true,
      message: "حالت کامیابی سے تبدیل ہو گئی",
      submission: contest.submissions[idx]
    });
  } catch (error) {
    console.error("Update submission status error:", error);
    res.status(500).json({ success: false, message: "حالت تبدیل کرنے میں خرابی" });
  }
});

// Finalize contest results (admin only) - calculates rankings from grades
router.put("/:id/finalize-results", adminAuth, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ success: false, message: "Contest not found" });
    }

    // Get all graded and qualified submissions
    const gradedSubmissions = contest.submissions
      .filter(s => s.grade?.score != null && s.status !== "disqualified")
      .sort((a, b) => (b.grade.score || 0) - (a.grade.score || 0));

    if (gradedSubmissions.length === 0) {
      return res.status(400).json({ success: false, message: "کوئی درجہ بندی شدہ جمع نہیں ملی" });
    }

    // Build results
    contest.results = gradedSubmissions.map((sub, index) => ({
      submission: sub.poem,
      participant: sub.participant,
      position: index + 1,
      score: sub.grade.score,
      prize: contest.prizes?.[index]?.prize || "",
      feedback: sub.grade.feedback || ""
    }));

    // Set winner and runner-ups
    if (gradedSubmissions.length > 0) {
      contest.winner = gradedSubmissions[0].participant;
    }
    if (gradedSubmissions.length > 1) {
      contest.runnerUps = gradedSubmissions.slice(1, 3).map(s => s.participant);
    }

    contest.status = "completed";
    await contest.save();

    const updated = await Contest.findById(req.params.id)
      .populate('participants.user', 'name email role isVerified')
      .populate('submissions.participant', 'name email role isVerified')
      .populate('submissions.poem', 'title content category createdAt')
      .populate('results.participant', 'name email role')
      .populate('results.submission', 'title content')
      .populate('winner', 'name email role')
      .lean();

    res.json({
      success: true,
      message: "نتائج کامیابی سے حتمی ہو گئے",
      contest: updated
    });
  } catch (error) {
    console.error("Finalize results error:", error);
    res.status(500).json({ success: false, message: "نتائج حتمی کرنے میں خرابی" });
  }
});

export default router;
