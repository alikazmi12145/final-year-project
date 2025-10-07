import mongoose from "mongoose";

const learningResourceSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  summary: {
    type: String,
    maxlength: 500
  },
  
  // Resource Type and Category
  type: {
    type: String,
    enum: ["tutorial", "guide", "reference", "tool", "exercise", "video", "audio", "document"],
    required: true
  },
  category: {
    type: String,
    enum: ["qaafia", "harf_e_ravi", "poetry_writing", "meter", "rhyme", "literary_terms", "history", "biographies"],
    required: true
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    required: true
  },
  
  // Content
  content: {
    text: String,
    html: String,
    markdown: String
  },
  
  // Media Resources
  media: {
    featuredImage: {
      url: String,
      publicId: String
    },
    audio: {
      url: String,
      publicId: String,
      duration: Number, // in seconds
      transcript: String
    },
    video: {
      url: String,
      publicId: String,
      duration: Number, // in seconds
      thumbnail: String,
      subtitles: [{
        language: String,
        url: String
      }]
    },
    documents: [{
      title: String,
      url: String,
      publicId: String,
      type: String, // pdf, doc, etc.
      size: Number // in bytes
    }],
    images: [{
      url: String,
      publicId: String,
      caption: String,
      alt: String
    }]
  },
  
  // Interactive Tools
  tools: {
    // Qaafia (Rhyme) Search Tool
    qaafiaData: [{
      word: String,
      rhymingWords: [String],
      pattern: String,
      examples: [String]
    }],
    
    // Harf-e-Ravi (Rhyme Letter) Tool
    harfERaviData: [{
      letter: String,
      words: [String],
      examples: [String]
    }],
    
    // Poetry Meter Tool
    meterPatterns: [{
      name: String,
      pattern: String,
      description: String,
      examples: [String]
    }],
    
    // Interactive Exercises
    exercises: [{
      question: String,
      type: {
        type: String,
        enum: ["fill_blank", "multiple_choice", "match", "arrange"]
      },
      options: [String],
      correctAnswer: String,
      explanation: String
    }]
  },
  
  // Structure and Organization
  sections: [{
    title: String,
    content: String,
    order: Number,
    subsections: [{
      title: String,
      content: String,
      order: Number
    }]
  }],
  
  // Prerequisites and Learning Path
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningResource'
  }],
  nextSteps: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningResource'
  }],
  relatedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningResource'
  }],
  
  // Tags and Keywords
  tags: [String],
  keywords: [String],
  searchTerms: [String],
  
  // Author and Contributors
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contributors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ["editor", "reviewer", "translator", "narrator"]
    },
    contributedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Publication Status
  status: {
    type: String,
    enum: ["draft", "review", "published", "archived"],
    default: "draft"
  },
  publishedAt: Date,
  featured: {
    type: Boolean,
    default: false
  },
  
  // Access Control
  isPublic: {
    type: Boolean,
    default: true
  },
  accessLevel: {
    type: String,
    enum: ["free", "premium", "subscription"],
    default: "free"
  },
  price: {
    amount: Number,
    currency: String
  },
  
  // Learning Analytics
  stats: {
    views: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 }, // in minutes
    bookmarks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  
  // User Progress Tracking
  userProgress: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedSections: [Number],
    timeSpent: { type: Number, default: 0 }, // in minutes
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    notes: String
  }],
  
  // Ratings and Reviews
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    review: String,
    helpful: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isHelpful: Boolean
    }],
    ratedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments and Discussions
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reply: String,
      repliedAt: {
        type: Date,
        default: Date.now
      }
    }],
    commentedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Bookmarks
  bookmarkedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Version Control
  version: {
    type: String,
    default: "1.0"
  },
  changelog: [{
    version: String,
    changes: [String],
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // SEO and Metadata
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: {
      type: String,
      unique: true
    },
    canonicalUrl: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
learningResourceSchema.index({ category: 1, type: 1 });
learningResourceSchema.index({ difficulty: 1, status: 1 });
learningResourceSchema.index({ featured: 1, 'stats.views': -1 });
learningResourceSchema.index({ tags: 1 });
learningResourceSchema.index({ title: 'text', description: 'text', keywords: 'text' });

// Virtual for estimated reading time
learningResourceSchema.virtual('estimatedReadingTime').get(function() {
  if (this.content && this.content.text) {
    const wordsPerMinute = 200;
    const wordCount = this.content.text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
  return 0;
});

// Virtual for completion rate
learningResourceSchema.virtual('completionRate').get(function() {
  if (this.stats.views === 0) return 0;
  return Math.round((this.stats.completions / this.stats.views) * 100);
});

// Pre-save middleware
learningResourceSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.seo.slug && this.title) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Update stats
  if (this.ratings.length > 0) {
    const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
    this.stats.averageRating = totalRating / this.ratings.length;
    this.stats.totalRatings = this.ratings.length;
  }
  
  this.stats.bookmarks = this.bookmarkedBy.length;
  
  // Set published date
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Methods
learningResourceSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

learningResourceSchema.methods.updateUserProgress = function(userId, sectionIndex, timeSpent) {
  let userProgressEntry = this.userProgress.find(up => up.user.equals(userId));
  
  if (!userProgressEntry) {
    userProgressEntry = {
      user: userId,
      progress: 0,
      completedSections: [],
      timeSpent: 0
    };
    this.userProgress.push(userProgressEntry);
  }
  
  // Add section to completed if not already there
  if (sectionIndex !== undefined && !userProgressEntry.completedSections.includes(sectionIndex)) {
    userProgressEntry.completedSections.push(sectionIndex);
  }
  
  // Update progress percentage
  const totalSections = this.sections.length || 1;
  userProgressEntry.progress = Math.round((userProgressEntry.completedSections.length / totalSections) * 100);
  
  // Update time spent
  if (timeSpent) {
    userProgressEntry.timeSpent += timeSpent;
  }
  
  // Update last accessed
  userProgressEntry.lastAccessed = new Date();
  
  // Check if completed
  if (userProgressEntry.progress === 100 && !userProgressEntry.completed) {
    userProgressEntry.completed = true;
    userProgressEntry.completedAt = new Date();
    this.stats.completions += 1;
  }
  
  return this.save();
};

learningResourceSchema.methods.addRating = function(userId, rating, review) {
  // Remove existing rating
  this.ratings = this.ratings.filter(r => !r.user.equals(userId));
  
  // Add new rating
  this.ratings.push({
    user: userId,
    rating,
    review
  });
  
  return this.save();
};

learningResourceSchema.methods.toggleBookmark = function(userId) {
  const bookmarkIndex = this.bookmarkedBy.findIndex(b => b.user.equals(userId));
  
  if (bookmarkIndex >= 0) {
    this.bookmarkedBy.splice(bookmarkIndex, 1);
  } else {
    this.bookmarkedBy.push({ user: userId });
  }
  
  return this.save();
};

// Static methods
learningResourceSchema.statics.findByCategory = function(category, difficulty = null) {
  const query = { category, status: 'published' };
  if (difficulty) {
    query.difficulty = difficulty;
  }
  return this.find(query).sort({ featured: -1, 'stats.views': -1 });
};

learningResourceSchema.statics.findQaafiaWords = function(pattern) {
  return this.findOne({
    category: 'qaafia',
    'tools.qaafiaData.pattern': new RegExp(pattern, 'i')
  });
};

learningResourceSchema.statics.findHarfERaviWords = function(letter) {
  return this.findOne({
    category: 'harf_e_ravi',
    'tools.harfERaviData.letter': letter
  });
};

export default mongoose.model("LearningResource", learningResourceSchema);