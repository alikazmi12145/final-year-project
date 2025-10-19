import LearningResource from "../models/LearningResource.js";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * Learning Controller for Bazm-E-Sukhan Platform
 * Handles educational content, tutorials, quizzes, and learning resources for poetry
 */

class LearningController {
  // ============= LEARNING RESOURCES =============

  /**
   * Get all learning resources with filtering and pagination
   */
  static async getAllResources(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        level,
        type,
        language,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        featured = false,
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = { status: "published" };

      if (category && category !== "all") {
        query.category = category;
      }

      if (level && level !== "all") {
        query.level = level;
      }

      if (type && type !== "all") {
        query.type = type;
      }

      if (language && language !== "all") {
        query.language = language;
      }

      if (featured === "true") {
        query.featured = true;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const resources = await LearningResource.find(query)
        .populate("author", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalResources = await LearningResource.countDocuments(query);

      res.json({
        success: true,
        resources,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalResources / limitNum),
          totalResources,
          hasNext: pageNum < Math.ceil(totalResources / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching learning resources:", error);
      res.status(500).json({
        success: false,
        message: "تعلیمی وسائل حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get single learning resource by ID
   */
  static async getResourceById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط وسیلہ ID",
        });
      }

      const resource = await LearningResource.findById(id)
        .populate("author", "username profile.fullName")
        .populate("relatedQuizzes", "title description questionsCount")
        .populate("relatedResources", "title type level");

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "تعلیمی وسیلہ موجود نہیں",
        });
      }

      // Increment view count (if user is not the author)
      if (userId && resource.author._id.toString() !== userId) {
        await LearningResource.findByIdAndUpdate(id, { $inc: { views: 1 } });
      }

      // Check if user has completed this resource
      let isCompleted = false;
      let completionProgress = 0;

      if (userId) {
        isCompleted = resource.completedBy.some(
          (completion) => completion.user.toString() === userId
        );

        // Calculate progress based on user interactions
        if (resource.type === "course" && resource.modules) {
          const userProgress = resource.modules.filter((module) =>
            module.completedBy.some((comp) => comp.user.toString() === userId)
          );
          completionProgress = Math.round(
            (userProgress.length / resource.modules.length) * 100
          );
        }
      }

      res.json({
        success: true,
        resource,
        userProgress: {
          isCompleted,
          completionProgress,
        },
      });
    } catch (error) {
      console.error("Error fetching learning resource:", error);
      res.status(500).json({
        success: false,
        message: "تعلیمی وسیلہ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new learning resource (Educator/Admin only)
   */
  static async createResource(req, res) {
    try {
      const {
        title,
        description,
        content,
        type,
        category,
        level,
        language = "urdu",
        tags,
        estimatedDuration,
        prerequisites,
        learningObjectives,
        modules,
        resources,
        featured = false,
      } = req.body;

      // Validate required fields
      if (!title || !description || !content || !type || !category || !level) {
        return res.status(400).json({
          success: false,
          message: "تمام ضروری فیلڈز کو بھریں",
        });
      }

      const learningResource = new LearningResource({
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        type,
        category,
        level,
        language,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
        estimatedDuration,
        prerequisites: prerequisites || [],
        learningObjectives: learningObjectives || [],
        modules: modules || [],
        resources: resources || [],
        author: req.user.id,
        featured,
        status: "published",
      });

      // Handle media uploads if present
      if (req.files) {
        if (req.files.thumbnail) {
          learningResource.thumbnail = {
            url: req.files.thumbnail[0].path,
            publicId: req.files.thumbnail[0].filename,
          };
        }

        if (req.files.attachments) {
          learningResource.attachments = req.files.attachments.map((file) => ({
            url: file.path,
            publicId: file.filename,
            filename: file.originalname,
            fileType: file.mimetype,
          }));
        }
      }

      await learningResource.save();

      await learningResource.populate("author", "username profile.fullName");

      res.status(201).json({
        success: true,
        message: "تعلیمی وسیلہ کامیابی سے بنایا گیا",
        resource: learningResource,
      });
    } catch (error) {
      console.error("Error creating learning resource:", error);
      res.status(500).json({
        success: false,
        message: "تعلیمی وسیلہ بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update learning resource (Author/Admin only)
   */
  static async updateResource(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط وسیلہ ID",
        });
      }

      const resource = await LearningResource.findById(id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "تعلیمی وسیلہ موجود نہیں",
        });
      }

      // Check authorization
      if (resource.author.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "اس وسیلہ میں تبدیلی کی اجازت نہیں",
        });
      }

      // Update fields
      const allowedFields = [
        "title",
        "description",
        "content",
        "type",
        "category",
        "level",
        "language",
        "tags",
        "estimatedDuration",
        "prerequisites",
        "learningObjectives",
        "modules",
        "resources",
        "featured",
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          resource[field] = updateData[field];
        }
      });

      // Handle new file uploads
      if (req.files) {
        if (req.files.thumbnail) {
          resource.thumbnail = {
            url: req.files.thumbnail[0].path,
            publicId: req.files.thumbnail[0].filename,
          };
        }

        if (req.files.attachments) {
          resource.attachments = req.files.attachments.map((file) => ({
            url: file.path,
            publicId: file.filename,
            filename: file.originalname,
            fileType: file.mimetype,
          }));
        }
      }

      resource.updatedAt = new Date();
      await resource.save();

      await resource.populate("author", "username profile.fullName");

      res.json({
        success: true,
        message: "تعلیمی وسیلہ کامیابی سے اپ ڈیٹ ہوا",
        resource,
      });
    } catch (error) {
      console.error("Error updating learning resource:", error);
      res.status(500).json({
        success: false,
        message: "تعلیمی وسیلہ اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Mark resource as completed by user
   */
  static async markCompleted(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { moduleId, completionNotes } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط وسیلہ ID",
        });
      }

      const resource = await LearningResource.findById(id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "تعلیمی وسیلہ موجود نہیں",
        });
      }

      if (moduleId) {
        // Mark specific module as completed
        const module = resource.modules.id(moduleId);
        if (!module) {
          return res.status(404).json({
            success: false,
            message: "ماڈیول موجود نہیں",
          });
        }

        // Check if already completed
        const alreadyCompleted = module.completedBy.some(
          (comp) => comp.user.toString() === userId
        );

        if (!alreadyCompleted) {
          module.completedBy.push({
            user: userId,
            completedAt: new Date(),
            notes: completionNotes,
          });
        }
      } else {
        // Mark entire resource as completed
        const alreadyCompleted = resource.completedBy.some(
          (comp) => comp.user.toString() === userId
        );

        if (!alreadyCompleted) {
          resource.completedBy.push({
            user: userId,
            completedAt: new Date(),
            notes: completionNotes,
          });
        }
      }

      await resource.save();

      res.json({
        success: true,
        message: moduleId ? "ماڈیول مکمل ہو گیا" : "تعلیمی وسیلہ مکمل ہو گیا",
      });
    } catch (error) {
      console.error("Error marking resource completed:", error);
      res.status(500).json({
        success: false,
        message: "وسیلہ مکمل کرنے میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= QUIZ SYSTEM =============

  /**
   * Get all quizzes with filtering
   */
  static async getAllQuizzes(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        level,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = { status: "published" };

      if (category && category !== "all") {
        query.category = category;
      }

      if (level && level !== "all") {
        query.level = level;
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
        .populate("author", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select("-questions.correctAnswer"); // Hide correct answers

      const totalQuizzes = await Quiz.countDocuments(query);

      res.json({
        success: true,
        quizzes,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalQuizzes / limitNum),
          totalQuizzes,
          hasNext: pageNum < Math.ceil(totalQuizzes / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({
        success: false,
        message: "کوئز حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get quiz by ID (for taking quiz)
   */
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط کوئز ID",
        });
      }

      const quiz = await Quiz.findById(id)
        .populate("author", "username profile.fullName")
        .select("-questions.correctAnswer"); // Hide correct answers for quiz taking

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "کوئز موجود نہیں",
        });
      }

      // Check if user has already attempted this quiz
      let hasAttempted = false;
      let userScore = null;
      let attemptsLeft = quiz.maxAttempts || 1;

      if (userId) {
        const userAttempts = quiz.attempts.filter(
          (attempt) => attempt.user.toString() === userId
        );
        hasAttempted = userAttempts.length > 0;
        attemptsLeft = Math.max(
          0,
          (quiz.maxAttempts || 1) - userAttempts.length
        );

        if (hasAttempted) {
          const lastAttempt = userAttempts[userAttempts.length - 1];
          userScore = lastAttempt.score;
        }
      }

      res.json({
        success: true,
        quiz,
        userStatus: {
          hasAttempted,
          userScore,
          attemptsLeft,
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
   * Submit quiz answers
   */
  static async submitQuiz(req, res) {
    try {
      const { id } = req.params;
      const { answers, timeSpent } = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط کوئز ID",
        });
      }

      const quiz = await Quiz.findById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "کوئز موجود نہیں",
        });
      }

      // Check if user has attempts left
      const userAttempts = quiz.attempts.filter(
        (attempt) => attempt.user.toString() === userId
      );

      if (userAttempts.length >= (quiz.maxAttempts || 1)) {
        return res.status(400).json({
          success: false,
          message: "آپ کی کوشش ختم ہو گئی",
        });
      }

      // Calculate score
      let correctAnswers = 0;
      const totalQuestions = quiz.questions.length;
      const results = [];

      quiz.questions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correctAnswer;

        if (isCorrect) {
          correctAnswers++;
        }

        results.push({
          questionIndex: index,
          question: question.question,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation,
        });
      });

      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const passed = score >= (quiz.passingScore || 70);

      // Save attempt
      quiz.attempts.push({
        user: userId,
        score,
        answers,
        timeSpent: timeSpent || 0,
        passed,
        completedAt: new Date(),
      });

      await quiz.save();

      res.json({
        success: true,
        message: passed ? "مبارک! آپ کامیاب ہو گئے" : "دوبارہ کوشش کریں",
        results: {
          score,
          correctAnswers,
          totalQuestions,
          passed,
          timeSpent,
          detailedResults: results,
        },
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({
        success: false,
        message: "کوئز جمع کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new quiz (Educator/Admin only)
   */
  static async createQuiz(req, res) {
    try {
      const {
        title,
        description,
        category,
        level,
        questions,
        timeLimit,
        passingScore = 70,
        maxAttempts = 1,
        tags,
      } = req.body;

      if (
        !title ||
        !description ||
        !category ||
        !level ||
        !questions ||
        questions.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "تمام ضروری فیلڈز کو بھریں",
        });
      }

      // Validate questions
      for (const question of questions) {
        if (
          !question.question ||
          !question.options ||
          question.options.length < 2 ||
          question.correctAnswer === undefined
        ) {
          return res.status(400).json({
            success: false,
            message:
              "ہر سوال میں سوال، کم از کم دو آپشن اور صحیح جواب ہونا چاہیے",
          });
        }
      }

      const quiz = new Quiz({
        title: title.trim(),
        description: description.trim(),
        category,
        level,
        questions,
        questionsCount: questions.length,
        timeLimit,
        passingScore,
        maxAttempts,
        tags: tags?.map((tag) => tag.toLowerCase().trim()) || [],
        author: req.user.id,
        status: "published",
      });

      await quiz.save();

      await quiz.populate("author", "username profile.fullName");

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

  // ============= USER PROGRESS =============

  /**
   * Get user's learning progress
   */
  static async getUserProgress(req, res) {
    try {
      const userId = req.user.id;

      // Get completed resources
      const completedResources = await LearningResource.find({
        "completedBy.user": userId,
      })
        .populate("completedBy.user", "username")
        .select("title type category level completedBy");

      // Get quiz attempts
      const quizAttempts = await Quiz.find({
        "attempts.user": userId,
      })
        .populate("attempts.user", "username")
        .select("title category level attempts");

      // Calculate statistics
      const totalResourcesCompleted = completedResources.length;
      const totalQuizzesAttempted = quizAttempts.length;

      let totalQuizzesPassed = 0;
      let averageQuizScore = 0;
      let totalQuizScore = 0;

      quizAttempts.forEach((quiz) => {
        const userAttempts = quiz.attempts.filter(
          (attempt) => attempt.user.toString() === userId
        );
        const bestAttempt = userAttempts.reduce((best, current) =>
          current.score > best.score ? current : best
        );

        if (bestAttempt.passed) {
          totalQuizzesPassed++;
        }
        totalQuizScore += bestAttempt.score;
      });

      if (totalQuizzesAttempted > 0) {
        averageQuizScore = Math.round(totalQuizScore / totalQuizzesAttempted);
      }

      // Get learning streaks and activity
      const recentActivity = await LearningResource.find({
        "completedBy.user": userId,
        "completedBy.completedAt": {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      })
        .sort({ "completedBy.completedAt": -1 })
        .limit(10)
        .select("title type completedBy");

      const progress = {
        overview: {
          totalResourcesCompleted,
          totalQuizzesAttempted,
          totalQuizzesPassed,
          averageQuizScore,
        },
        completedResources: completedResources.map((resource) => ({
          ...resource.toObject(),
          userCompletion: resource.completedBy.find(
            (comp) => comp.user.toString() === userId
          ),
        })),
        quizHistory: quizAttempts.map((quiz) => ({
          ...quiz.toObject(),
          userAttempts: quiz.attempts.filter(
            (attempt) => attempt.user.toString() === userId
          ),
        })),
        recentActivity,
      };

      res.json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({
        success: false,
        message: "تعلیمی پیش قدمی حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= FEATURED & RECOMMENDATIONS =============

  /**
   * Get featured learning content
   */
  static async getFeaturedContent(req, res) {
    try {
      const { limit = 6 } = req.query;

      const [featuredResources, popularQuizzes, recentResources] =
        await Promise.all([
          LearningResource.find({ featured: true, status: "published" })
            .populate("author", "username profile.fullName")
            .sort({ views: -1 })
            .limit(parseInt(limit) / 2),
          Quiz.find({ status: "published" })
            .populate("author", "username profile.fullName")
            .sort({ "attempts.length": -1 })
            .limit(parseInt(limit) / 2),
          LearningResource.find({ status: "published" })
            .populate("author", "username profile.fullName")
            .sort({ createdAt: -1 })
            .limit(3),
        ]);

      res.json({
        success: true,
        featured: {
          resources: featuredResources,
          quizzes: popularQuizzes,
          recent: recentResources,
        },
      });
    } catch (error) {
      console.error("Error fetching featured content:", error);
      res.status(500).json({
        success: false,
        message: "نمایاں مواد حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get learning statistics
   */
  static async getLearningStatistics(req, res) {
    try {
      const [
        totalResources,
        totalQuizzes,
        totalLearners,
        categoryStats,
        levelStats,
      ] = await Promise.all([
        LearningResource.countDocuments({ status: "published" }),
        Quiz.countDocuments({ status: "published" }),
        User.countDocuments({ role: { $in: ["reader", "poet"] } }),
        LearningResource.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        LearningResource.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: "$level", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      const statistics = {
        overview: {
          totalResources,
          totalQuizzes,
          totalLearners,
        },
        distributions: {
          byCategory: categoryStats,
          byLevel: levelStats,
        },
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching learning statistics:", error);
      res.status(500).json({
        success: false,
        message: "تعلیمی اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default LearningController;
