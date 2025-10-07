import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ["poetry_knowledge", "poet_biography", "literary_terms", "classical_poetry", "modern_poetry", "general"],
    required: true
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    required: true
  },
  
  // Quiz Configuration
  questions: [{
    question: {
      type: String,
      required: true,
      maxlength: 500
    },
    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "fill_blank", "match"],
      default: "multiple_choice"
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: String, // For fill_blank type
    explanation: String,
    points: {
      type: Number,
      default: 1
    },
    timeLimit: {
      type: Number,
      default: 30 // seconds
    },
    media: {
      image: String,
      audio: String
    }
  }],
  
  // Quiz Settings
  totalQuestions: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  timeLimit: {
    type: Number, // Total time in minutes
    default: 15
  },
  passingScore: {
    type: Number,
    default: 60 // percentage
  },
  allowRetake: {
    type: Boolean,
    default: true
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  shuffleQuestions: {
    type: Boolean,
    default: true
  },
  showCorrectAnswers: {
    type: Boolean,
    default: true
  },
  
  // Creator and Status
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ["draft", "published", "archived"],
    default: "draft"
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Access Control
  isPublic: {
    type: Boolean,
    default: true
  },
  accessCode: String, // For private quizzes
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Analytics and Statistics
  stats: {
    totalAttempts: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 }, // in seconds
    completionRate: { type: Number, default: 0 }, // percentage
    passRate: { type: Number, default: 0 } // percentage
  },
  
  // Attempts tracking
  attempts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    score: Number,
    percentage: Number,
    timeSpent: Number, // in seconds
    passed: Boolean,
    answers: [{
      questionIndex: Number,
      selectedOption: String,
      userAnswer: String,
      isCorrect: Boolean,
      points: Number,
      timeSpent: Number
    }],
    attemptNumber: Number
  }],
  
  // Leaderboard
  leaderboard: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bestScore: Number,
    bestPercentage: Number,
    bestTime: Number,
    totalAttempts: Number,
    achievedAt: Date
  }],
  
  // Tags and Categories
  tags: [String],
  relatedPoets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poet'
  }],
  relatedPoems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poem'
  }],
  
  // Media
  thumbnail: {
    url: String,
    publicId: String
  },
  
  // Schedule
  availableFrom: Date,
  availableUntil: Date,
  
  // Rewards
  badges: [{
    name: String,
    description: String,
    icon: String,
    requirement: String, // e.g., "Score above 90%"
    awardedTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      awardedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Certificate
  certificate: {
    enabled: Boolean,
    template: String,
    title: String,
    description: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
quizSchema.index({ category: 1, difficulty: 1 });
quizSchema.index({ createdBy: 1 });
quizSchema.index({ featured: 1, 'stats.totalAttempts': -1 });
quizSchema.index({ status: 1, isPublic: 1 });

// Virtual for completion rate
quizSchema.virtual('completionRatePercent').get(function() {
  if (this.stats.totalAttempts === 0) return 0;
  return Math.round((this.stats.totalCompletions / this.stats.totalAttempts) * 100);
});

// Virtual for average time formatted
quizSchema.virtual('averageTimeFormatted').get(function() {
  const minutes = Math.floor(this.stats.averageTime / 60);
  const seconds = this.stats.averageTime % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Pre-save middleware
quizSchema.pre('save', function(next) {
  // Update total questions and points
  this.totalQuestions = this.questions.length;
  this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  
  // Update stats
  if (this.attempts.length > 0) {
    const completedAttempts = this.attempts.filter(a => a.completedAt);
    this.stats.totalAttempts = this.attempts.length;
    this.stats.totalCompletions = completedAttempts.length;
    
    if (completedAttempts.length > 0) {
      this.stats.averageScore = completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length;
      this.stats.averageTime = completedAttempts.reduce((sum, a) => sum + a.timeSpent, 0) / completedAttempts.length;
      this.stats.completionRate = (completedAttempts.length / this.attempts.length) * 100;
      this.stats.passRate = (completedAttempts.filter(a => a.passed).length / completedAttempts.length) * 100;
    }
  }
  
  next();
});

// Methods
quizSchema.methods.startAttempt = function(userId) {
  // Check if user can take quiz
  const userAttempts = this.attempts.filter(a => a.user.equals(userId));
  
  if (!this.allowRetake && userAttempts.length > 0) {
    throw new Error('Retakes not allowed');
  }
  
  if (userAttempts.length >= this.maxAttempts) {
    throw new Error('Maximum attempts reached');
  }
  
  // Check availability
  const now = new Date();
  if (this.availableFrom && now < this.availableFrom) {
    throw new Error('Quiz not yet available');
  }
  if (this.availableUntil && now > this.availableUntil) {
    throw new Error('Quiz no longer available');
  }
  
  // Create new attempt
  const attempt = {
    user: userId,
    attemptNumber: userAttempts.length + 1,
    answers: []
  };
  
  this.attempts.push(attempt);
  return this.save().then(() => attempt);
};

quizSchema.methods.submitAnswer = function(userId, questionIndex, answer, timeSpent) {
  const attempt = this.attempts.find(a => 
    a.user.equals(userId) && !a.completedAt
  );
  
  if (!attempt) {
    throw new Error('No active attempt found');
  }
  
  const question = this.questions[questionIndex];
  if (!question) {
    throw new Error('Invalid question index');
  }
  
  let isCorrect = false;
  let points = 0;
  
  // Check answer based on question type
  if (question.type === 'multiple_choice') {
    const selectedOption = question.options.find(opt => opt.text === answer);
    isCorrect = selectedOption && selectedOption.isCorrect;
  } else if (question.type === 'true_false') {
    isCorrect = answer === question.correctAnswer;
  } else if (question.type === 'fill_blank') {
    isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  }
  
  if (isCorrect) {
    points = question.points;
  }
  
  // Update or add answer
  const existingAnswerIndex = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
  const answerData = {
    questionIndex,
    selectedOption: answer,
    userAnswer: answer,
    isCorrect,
    points,
    timeSpent
  };
  
  if (existingAnswerIndex >= 0) {
    attempt.answers[existingAnswerIndex] = answerData;
  } else {
    attempt.answers.push(answerData);
  }
  
  return this.save();
};

quizSchema.methods.completeAttempt = function(userId) {
  const attempt = this.attempts.find(a => 
    a.user.equals(userId) && !a.completedAt
  );
  
  if (!attempt) {
    throw new Error('No active attempt found');
  }
  
  // Calculate final score
  const totalScore = attempt.answers.reduce((sum, a) => sum + a.points, 0);
  const percentage = (totalScore / this.totalPoints) * 100;
  const passed = percentage >= this.passingScore;
  const timeSpent = attempt.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  
  // Update attempt
  attempt.completedAt = new Date();
  attempt.score = totalScore;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.timeSpent = timeSpent;
  
  // Update leaderboard
  this.updateLeaderboard(userId, totalScore, percentage, timeSpent);
  
  // Award badges
  this.checkAndAwardBadges(userId, percentage, timeSpent);
  
  return this.save().then(() => attempt);
};

quizSchema.methods.updateLeaderboard = function(userId, score, percentage, timeSpent) {
  let userEntry = this.leaderboard.find(entry => entry.user.equals(userId));
  
  if (!userEntry) {
    userEntry = {
      user: userId,
      bestScore: score,
      bestPercentage: percentage,
      bestTime: timeSpent,
      totalAttempts: 1,
      achievedAt: new Date()
    };
    this.leaderboard.push(userEntry);
  } else {
    userEntry.totalAttempts += 1;
    if (percentage > userEntry.bestPercentage || 
        (percentage === userEntry.bestPercentage && timeSpent < userEntry.bestTime)) {
      userEntry.bestScore = score;
      userEntry.bestPercentage = percentage;
      userEntry.bestTime = timeSpent;
      userEntry.achievedAt = new Date();
    }
  }
  
  // Sort leaderboard
  this.leaderboard.sort((a, b) => {
    if (b.bestPercentage !== a.bestPercentage) {
      return b.bestPercentage - a.bestPercentage;
    }
    return a.bestTime - b.bestTime;
  });
  
  // Keep top 100
  this.leaderboard = this.leaderboard.slice(0, 100);
};

quizSchema.methods.checkAndAwardBadges = function(userId, percentage, timeSpent) {
  this.badges.forEach(badge => {
    const alreadyAwarded = badge.awardedTo.some(award => award.user.equals(userId));
    if (alreadyAwarded) return;
    
    let shouldAward = false;
    
    // Simple badge logic - can be extended
    if (badge.requirement.includes('90%') && percentage >= 90) {
      shouldAward = true;
    } else if (badge.requirement.includes('perfect') && percentage === 100) {
      shouldAward = true;
    } else if (badge.requirement.includes('speed') && timeSpent < this.timeLimit * 30) { // Under half time
      shouldAward = true;
    }
    
    if (shouldAward) {
      badge.awardedTo.push({ user: userId });
    }
  });
};

export default mongoose.model("Quiz", quizSchema);