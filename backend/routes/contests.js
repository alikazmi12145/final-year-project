import express from "express";
import { body, validationResult } from "express-validator";
import Contest from "../models/Contest.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
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

    const contests = await Contest.find(query)
      .populate('organizer', 'name')
      .populate('judges', 'name')
      .populate('winners.user', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Contest.countDocuments(query);

    // Add participation status for authenticated users
    const contestsWithStatus = contests.map(contest => {
      const userParticipation = req.user ? 
        contest.participants.find(p => p.user?.toString() === req.user.userId) : 
        null;

      return {
        ...contest,
        userHasParticipated: !!userParticipation,
        userSubmission: userParticipation?.submission || null,
        timeRemaining: contest.submissionDeadline ? 
          Math.max(0, new Date(contest.submissionDeadline) - new Date()) : null
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
    const contest = await Contest.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('judges', 'name bio')
      .populate('participants.user', 'name isVerified')
      .populate('participants.submission', 'title content category createdAt')
      .populate('winners.user', 'name')
      .populate('winners.submission', 'title content')
      .lean();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // Check user participation
    const userParticipation = req.user ? 
      contest.participants.find(p => p.user?._id?.toString() === req.user.userId) : 
      null;

    // Calculate contest metrics
    const metrics = {
      totalParticipants: contest.participants.length,
      totalSubmissions: contest.participants.filter(p => p.submission).length,
      averageRating: contest.participants.length > 0 ? 
        contest.participants.reduce((sum, p) => sum + (p.rating || 0), 0) / contest.participants.length : 
        0,
      timeRemaining: contest.submissionDeadline ? 
        Math.max(0, new Date(contest.submissionDeadline) - new Date()) : null,
      daysRemaining: contest.submissionDeadline ? 
        Math.max(0, Math.ceil((new Date(contest.submissionDeadline) - new Date()) / (1000 * 60 * 60 * 24))) : 
        null
    };

    res.json({
      success: true,
      contest: {
        ...contest,
        userHasParticipated: !!userParticipation,
        userSubmission: userParticipation?.submission || null,
        userCanVote: req.user && contest.status === 'voting' && !userParticipation,
        canSubmit: contest.status === 'active' && 
                   new Date() < new Date(contest.submissionDeadline) && 
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
    "ghazal", "nazm", "rubai", "qasida", "free_verse", 
    "hamd", "naat", "manqabat", "general"
  ]),
  body("theme").optional().isLength({ max: 100 }).trim(),
  body("rules").isArray({ min: 1, max: 20 }),
  body("prizes").isArray({ min: 1, max: 10 }),
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
        message: "Submission deadline must be in the future"
      });
    }

    if (voteDeadline && voteDeadline <= subDeadline) {
      return res.status(400).json({
        success: false,
        message: "Voting deadline must be after submission deadline"
      });
    }

    const contest = new Contest({
      title,
      description,
      category,
      theme,
      rules,
      prizes,
      submissionDeadline: subDeadline,
      votingDeadline: voteDeadline,
      maxParticipants,
      entryFee: entryFee || 0,
      language,
      organizer: req.user.userId,
      judges: judges || [],
      status: "upcoming"
    });

    await contest.save();
    await contest.populate('organizer', 'name');

    res.status(201).json({
      success: true,
      message: "Contest created successfully",
      contest
    });
  } catch (error) {
    console.error("Create contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create contest"
    });
  }
});

// Participate in contest
router.post("/:id/participate", auth, contestOperationLimit, [
  body("poemId").isMongoId()
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

    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // Check contest status and deadline
    if (contest.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: "Contest is not accepting submissions"
      });
    }

    if (new Date() > new Date(contest.submissionDeadline)) {
      return res.status(400).json({
        success: false,
        message: "Submission deadline has passed"
      });
    }

    // Check if user already participated
    const existingParticipation = contest.participants.find(
      p => p.user.toString() === req.user.userId
    );

    if (existingParticipation) {
      return res.status(400).json({
        success: false,
        message: "You have already participated in this contest"
      });
    }

    // Check max participants
    if (contest.maxParticipants && contest.participants.length >= contest.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "Contest has reached maximum participants"
      });
    }

    // Verify poem ownership and eligibility
    const poem = await Poem.findById(req.body.poemId);
    
    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found"
      });
    }

    if (poem.author.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only submit your own poems"
      });
    }

    if (poem.category !== contest.category && contest.category !== 'general') {
      return res.status(400).json({
        success: false,
        message: `Poem category must be ${contest.category} for this contest`
      });
    }

    // Add participation
    contest.participants.push({
      user: req.user.userId,
      submission: poem._id,
      submittedAt: new Date()
    });

    contest.participantsCount += 1;
    await contest.save();

    res.status(201).json({
      success: true,
      message: "Successfully participated in contest"
    });
  } catch (error) {
    console.error("Participate in contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to participate in contest"
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

    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // Check if contest allows public voting
    if (!contest.publicVoting || contest.status !== 'voting') {
      return res.status(400).json({
        success: false,
        message: "Voting is not available for this contest"
      });
    }

    // Check voting deadline
    if (contest.votingDeadline && new Date() > new Date(contest.votingDeadline)) {
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
      p => p._id.toString() === req.body.participantId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found"
      });
    }

    // Check if user already voted for this participant
    const existingVote = participant.votes.find(
      v => v.voter.toString() === req.user.userId
    );

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: "You have already voted for this submission"
      });
    }

    // Add vote
    participant.votes.push({
      voter: req.user.userId,
      rating: req.body.rating,
      createdAt: new Date()
    });

    // Recalculate average rating
    const totalRating = participant.votes.reduce((sum, vote) => sum + vote.rating, 0);
    participant.rating = totalRating / participant.votes.length;

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
    const contest = await Contest.findById(req.params.id)
      .populate('participants.user', 'name isVerified')
      .populate('participants.submission', 'title category createdAt')
      .lean();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    // Sort participants by rating/votes
    const leaderboard = contest.participants
      .filter(p => p.submission) // Only include participants with submissions
      .sort((a, b) => {
        // Sort by rating first, then by votes count, then by submission time
        if (b.rating !== a.rating) {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (b.votes.length !== a.votes.length) {
          return b.votes.length - a.votes.length;
        }
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      })
      .map((participant, index) => ({
        rank: index + 1,
        user: participant.user,
        submission: participant.submission,
        rating: participant.rating || 0,
        votesCount: participant.votes.length,
        submittedAt: participant.submittedAt
      }));

    res.json({
      success: true,
      leaderboard,
      contest: {
        id: contest._id,
        title: contest.title,
        status: contest.status,
        totalParticipants: contest.participants.length
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

export default router;
