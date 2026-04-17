import Quiz from "../models/Quiz.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * Quiz Controller for Bazm-E-Sukhan Platform
 * Handles quiz CRUD, attempts, and leaderboards
 */
class QuizController {
  // ============= QUIZ MANAGEMENT =============

  /**
   * Get all published quizzes with filtering and pagination
   */
  static async getAllQuizzes(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        difficulty,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // If admin=true param, show all quizzes regardless of status
      const isAdmin = req.query.admin === "true";
      const query = isAdmin ? {} : { status: "published", isPublic: true };

      if (category && category !== "all") {
        query.category = category;
      }
      if (difficulty && difficulty !== "all") {
        query.difficulty = difficulty;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const quizzes = await Quiz.find(query)
        .populate("createdBy", "name")
        .select("-questions.options.isCorrect -questions.correctAnswer -attempts")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Quiz.countDocuments(query);

      res.json({
        success: true,
        quizzes,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({
        success: false,
        message: "کوئزز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get single quiz by ID
   */
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "غلط کوئز ID" });
      }

      const quiz = await Quiz.findById(id)
        .populate("createdBy", "name")
        .populate("attempts.user", "name")
        .populate("leaderboard.user", "name profileImage")
        .lean();

      if (!quiz) {
        return res.status(404).json({ success: false, message: "کوئز موجود نہیں" });
      }

      // Hide correct answers from non-admin users
      const userId = req.user?.userId || req.user?.id;
      const isCreator = userId && quiz.createdBy?._id?.toString() === userId;
      const isAdmin = req.user?.role === "admin";

      if (!isCreator && !isAdmin) {
        quiz.questions = quiz.questions.map((q) => ({
          ...q,
          options: q.options.map(({ text }) => ({ text })),
          correctAnswer: undefined,
        }));
        // Don't expose other users' attempts
        quiz.attempts = undefined;
      }

      // Check user's attempt status
      let userAttempts = [];
      if (userId) {
        const fullQuiz = await Quiz.findById(id).select("attempts").lean();
        userAttempts = (fullQuiz.attempts || []).filter(
          (a) => a.user.toString() === userId
        );
      }

      res.json({
        success: true,
        quiz: {
          ...quiz,
          userAttempts: userAttempts.map((a) => ({
            score: a.score,
            percentage: a.percentage,
            passed: a.passed,
            completedAt: a.completedAt,
            attemptNumber: a.attemptNumber,
          })),
          canAttempt: !userId ? false : userAttempts.filter(a => a.completedAt).length === 0,
        },
      });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({
        success: false,
        message: "کوئز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create a new quiz (Admin only)
   */
  static async createQuiz(req, res) {
    try {
      const {
        title,
        description,
        category,
        difficulty,
        questions,
        timeLimit,
        passingScore,
        allowRetake,
        maxAttempts,
        shuffleQuestions,
        showCorrectAnswers,
      } = req.body;

      if (!title || !category || !difficulty || !questions?.length) {
        return res.status(400).json({
          success: false,
          message: "ضروری معلومات مکمل کریں",
        });
      }

      // Validate each question has at least one correct answer
      for (const q of questions) {
        if (!q.question || !q.options?.length) {
          return res.status(400).json({
            success: false,
            message: "ہر سوال میں متن اور آپشنز ضروری ہیں",
          });
        }
        if (q.type === "multiple_choice") {
          const hasCorrect = q.options.some((opt) => opt.isCorrect);
          if (!hasCorrect) {
            return res.status(400).json({
              success: false,
              message: "ہر سوال کا ایک صحیح جواب ضروری ہے",
            });
          }
        }
      }

      const userId = req.user.userId || req.user.id;

      const quiz = new Quiz({
        title: title.trim(),
        description: description?.trim(),
        category,
        difficulty,
        questions,
        timeLimit: timeLimit || 15,
        passingScore: passingScore || 60,
        allowRetake: false,
        maxAttempts: 1,
        shuffleQuestions: shuffleQuestions !== false,
        showCorrectAnswers: showCorrectAnswers !== false,
        createdBy: userId,
        status: "published",
      });

      await quiz.save();
      await quiz.populate("createdBy", "name");

      res.status(201).json({
        success: true,
        message: "کوئز کامیابی سے بنایا گیا",
        quiz,
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({
        success: false,
        message: "کوئز بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= QUIZ ATTEMPT =============

  /**
   * Start a quiz attempt
   */
  static async startAttempt(req, res) {
    try {
      const { id } = req.params;
      const userId = (req.user.userId || req.user.id).toString();

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "غلط کوئز ID" });
      }

      const quiz = await Quiz.findById(id);

      if (!quiz || quiz.status !== "published") {
        return res.status(404).json({ success: false, message: "کوئز دستیاب نہیں" });
      }

      // Check attempt limits
      const userAttempts = quiz.attempts.filter(
        (a) => a.user.toString() === userId
      );

      // Only one attempt allowed per user
      const completedAttempts = userAttempts.filter(a => a.completedAt);
      if (completedAttempts.length > 0) {
        return res.status(400).json({
          success: false,
          message: "آپ پہلے ہی یہ کوئز دے چکے ہیں۔ دوبارہ کوشش کی اجازت نہیں",
        });
      }

      // Check for an already-active (incomplete) attempt
      const activeAttempt = quiz.attempts.find(
        (a) => a.user.toString() === userId && !a.completedAt
      );
      if (activeAttempt) {
        return res.json({
          success: true,
          message: "آپ کی پہلے سے شروع کی گئی کوشش جاری ہے",
          attemptId: activeAttempt._id,
          questions: quiz.questions.map((q, i) => ({
            index: i,
            question: q.question,
            type: q.type,
            options: q.options.map(({ text }) => ({ text })),
            points: q.points,
            timeLimit: q.timeLimit,
          })),
          timeLimit: quiz.timeLimit,
        });
      }

      // Create new attempt
      const attemptNumber = userAttempts.length + 1;
      quiz.attempts.push({
        user: userId,
        attemptNumber,
        answers: [],
      });

      await quiz.save();

      const newAttempt = quiz.attempts[quiz.attempts.length - 1];

      // Return questions without correct answers
      const questions = quiz.questions.map((q, i) => ({
        index: i,
        question: q.question,
        type: q.type,
        options: q.options.map(({ text }) => ({ text })),
        points: q.points,
        timeLimit: q.timeLimit,
      }));

      // Shuffle if enabled
      if (quiz.shuffleQuestions) {
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
      }

      res.status(201).json({
        success: true,
        message: "کوئز شروع ہو گیا",
        attemptId: newAttempt._id,
        questions,
        timeLimit: quiz.timeLimit,
      });
    } catch (error) {
      console.error("Error starting quiz attempt:", error);
      res.status(500).json({
        success: false,
        message: "کوئز شروع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Submit a complete quiz attempt (all answers at once)
   */
  static async submitAttempt(req, res) {
    try {
      const { id } = req.params;
      const { answers, timeSpent } = req.body;
      const userId = (req.user.userId || req.user.id).toString();

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "غلط کوئز ID" });
      }

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: "جوابات ضروری ہیں",
        });
      }

      const quiz = await Quiz.findById(id);

      if (!quiz) {
        return res.status(404).json({ success: false, message: "کوئز موجود نہیں" });
      }

      // Find active attempt
      const attempt = quiz.attempts.find(
        (a) => a.user.toString() === userId && !a.completedAt
      );

      if (!attempt) {
        return res.status(400).json({
          success: false,
          message: "کوئی فعال کوشش نہیں ملی - پہلے کوئز شروع کریں",
        });
      }

      // Grade each answer
      let totalScore = 0;
      const gradedAnswers = answers.map((ans) => {
        const question = quiz.questions[ans.questionIndex];
        if (!question) return null;

        let isCorrect = false;
        if (question.type === "multiple_choice") {
          const selected = question.options.find(
            (opt) => opt.text === ans.selectedOption
          );
          isCorrect = selected?.isCorrect === true;
        } else if (
          question.type === "true_false" ||
          question.type === "fill_blank"
        ) {
          isCorrect =
            ans.selectedOption?.toLowerCase().trim() ===
            question.correctAnswer?.toLowerCase().trim();
        }

        const points = isCorrect ? question.points : 0;
        totalScore += points;

        return {
          questionIndex: ans.questionIndex,
          selectedOption: ans.selectedOption,
          userAnswer: ans.selectedOption,
          isCorrect,
          points,
          timeSpent: ans.timeSpent || 0,
        };
      }).filter(Boolean);

      // Update attempt
      attempt.answers = gradedAnswers;
      attempt.completedAt = new Date();
      attempt.score = totalScore;
      attempt.percentage = quiz.totalPoints > 0
        ? Math.round((totalScore / quiz.totalPoints) * 100)
        : 0;
      attempt.passed = attempt.percentage >= quiz.passingScore;
      attempt.timeSpent = timeSpent || gradedAnswers.reduce((s, a) => s + (a.timeSpent || 0), 0);

      // Update leaderboard entry
      quiz.updateLeaderboard(userId, totalScore, attempt.percentage, attempt.timeSpent);

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { "stats.quizzesCompleted": 1 },
      });

      await quiz.save();

      // Build result response
      const result = {
        score: totalScore,
        totalPoints: quiz.totalPoints,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        correctCount: gradedAnswers.filter((a) => a.isCorrect).length,
        totalQuestions: quiz.questions.length,
      };

      // Include correct answers if quiz allows it
      if (quiz.showCorrectAnswers) {
        result.details = gradedAnswers.map((a) => {
          const question = quiz.questions[a.questionIndex];
          return {
            question: question.question,
            yourAnswer: a.selectedOption,
            correctAnswer:
              question.type === "multiple_choice"
                ? question.options.find((o) => o.isCorrect)?.text
                : question.correctAnswer,
            isCorrect: a.isCorrect,
            explanation: question.explanation,
          };
        });
      }

      res.json({
        success: true,
        message: attempt.passed
          ? "مبارک ہو! آپ نے کوئز میں کامیابی حاصل کی"
          : "کوئز مکمل ہو گیا",
        result,
      });
    } catch (error) {
      console.error("Error submitting quiz attempt:", error);
      res.status(500).json({
        success: false,
        message: "جوابات جمع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= LEADERBOARD =============

  /**
   * Get quiz leaderboard
   */
  static async getQuizLeaderboard(req, res) {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "غلط کوئز ID" });
      }

      const quiz = await Quiz.findById(id)
        .select("title leaderboard stats totalPoints")
        .populate("leaderboard.user", "name profileImage")
        .lean();

      if (!quiz) {
        return res.status(404).json({ success: false, message: "کوئز موجود نہیں" });
      }

      const leaderboard = (quiz.leaderboard || [])
        .sort((a, b) => {
          if (b.bestPercentage !== a.bestPercentage) return b.bestPercentage - a.bestPercentage;
          return a.bestTime - b.bestTime;
        })
        .slice(0, parseInt(limit))
        .map((entry, index) => ({
          rank: index + 1,
          user: entry.user,
          bestScore: entry.bestScore,
          bestPercentage: entry.bestPercentage,
          bestTime: entry.bestTime,
          totalAttempts: entry.totalAttempts,
          achievedAt: entry.achievedAt,
        }));

      res.json({
        success: true,
        quiz: { _id: quiz._id, title: quiz.title, totalPoints: quiz.totalPoints },
        leaderboard,
        stats: quiz.stats,
      });
    } catch (error) {
      console.error("Error fetching quiz leaderboard:", error);
      res.status(500).json({
        success: false,
        message: "لیڈربورڈ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default QuizController;
