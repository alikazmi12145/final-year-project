import mongoose from "mongoose";

const poemSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    transliteration: {
      type: String,
      maxlength: 10000,
    },
    translation: {
      english: String,
      hindi: String,
      other: String,
    },

    // Author Information
    poet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poet",
      required: false, // Make optional to avoid creation issues
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Classification
    category: {
      type: String,
      enum: [
        "ghazal",
        "nazm",
        "rubai",
        "qawwali",
        "marsiya",
        "salam",
        "hamd",
        "naat",
        "free-verse",
        "other",
      ],
      required: true,
    },
    subcategory: String,
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    mood: {
      type: String,
      enum: [
        "romantic",
        "sad",
        "patriotic",
        "spiritual",
        "philosophical",
        "humorous",
        "other",
      ],
    },
    theme: {
      type: String,
      enum: [
        "love",
        "separation",
        "nature",
        "friendship",
        "loss",
        "celebration",
        "prayer",
        "other",
      ],
    },

    // Publishing Information
    published: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    featured: {
      type: Boolean,
      default: false,
    },
    featuredAt: Date,

    // Content Metadata
    poetryLanguage: {
      type: String,
      enum: ["urdu", "english", "hindi", "persian", "arabic"],
      default: "urdu",
    },
    script: {
      type: String,
      enum: ["nastaliq", "naskh", "roman"],
      default: "nastaliq",
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    verseCount: {
      type: Number,
      default: 0,
    },

    // Media
    audio: {
      url: String,
      publicId: String,
      duration: Number, // in seconds
      recitedBy: String,
    },
    images: [
      {
        url: String,
        publicId: String,
        caption: String,
      },
    ],

    // Engagement
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    dislikes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        dislikedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    bookmarks: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        bookmarkedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    shares: {
      type: Number,
      default: 0,
    },

    // Reviews and Ratings
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        review: {
          type: String,
          maxlength: 1000,
        },
        ratedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Comments
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        comment: {
          type: String,
          required: true,
          maxlength: 500,
        },
        commentedAt: {
          type: Date,
          default: Date.now,
        },
        replies: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            reply: {
              type: String,
              required: true,
              maxlength: 300,
            },
            repliedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // Status and Moderation
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "submitted",
        "under_review",
        "approved",
        "published",
        "rejected",
        "flagged",
      ],
      default: "draft",
    },
    moderationNotes: String,
    rejectionReason: String,
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: Date,

    // Copyright and Attribution
    copyright: {
      type: String,
      enum: [
        "public_domain",
        "creative_commons",
        "all_rights_reserved",
        "custom",
      ],
      default: "all_rights_reserved",
    },
    customLicense: String,
    originalSource: String,

    // Contest Information
    contestEntry: {
      contest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contest",
      },
      submittedAt: Date,
      rank: Number,
      score: Number,
    },

    // Search and Indexing
    searchKeywords: [String],
    indexedContent: String, // Processed content for search

    // Analytics
    analytics: {
      dailyViews: [
        {
          date: { type: Date, default: Date.now },
          count: { type: Number, default: 0 },
        },
      ],
      totalReadTime: { type: Number, default: 0 }, // in seconds
      avgReadTime: { type: Number, default: 0 }, // in seconds
      bounceRate: { type: Number, default: 0 }, // percentage
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
poemSchema.index({ poet: 1, published: 1 });
poemSchema.index({ category: 1, published: 1 });
poemSchema.index({ tags: 1 });
poemSchema.index({ mood: 1, theme: 1 });
poemSchema.index({ publishedAt: -1 });
poemSchema.index({ views: -1 });
poemSchema.index({ averageRating: -1 });
poemSchema.index({ "contestEntry.contest": 1 });
// Temporarily disabled text index to fix language override issue
// poemSchema.index(
//   { title: "text", content: "text", searchKeywords: "text" },
//   { default_language: "none" }
// );

// Virtual for like count
poemSchema.virtual("likeCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for dislike count
poemSchema.virtual("dislikeCount").get(function () {
  return this.dislikes ? this.dislikes.length : 0;
});

// Virtual for comment count
poemSchema.virtual("commentCount").get(function () {
  return this.comments ? this.comments.length : 0;
});

// Virtual for bookmark count
poemSchema.virtual("bookmarkCount").get(function () {
  return this.bookmarks ? this.bookmarks.length : 0;
});

// Pre-save middleware
poemSchema.pre("save", function (next) {
  // Update word count
  if (this.isModified("content")) {
    this.wordCount = this.content.split(/\s+/).length;
    this.verseCount = this.content
      .split(/\n/)
      .filter((line) => line.trim()).length;

    // Create search keywords
    this.searchKeywords = this.content
      .toLowerCase()
      .replace(
        /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g,
        ""
      ) // Keep Urdu characters and spaces
      .split(/\s+/)
      .filter((word) => word.length > 2);

    this.indexedContent = this.content.toLowerCase();
  }

  // Set published date
  if (this.isModified("published") && this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Calculate average rating
  if (this.ratings && this.ratings.length > 0) {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.averageRating = sum / this.ratings.length;
  }

  next();
});

// Methods
poemSchema.methods.incrementViews = function () {
  this.views += 1;

  // Update daily views analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAnalytics = this.analytics.dailyViews.find(
    (view) => view.date.getTime() === today.getTime()
  );

  if (todayAnalytics) {
    todayAnalytics.count += 1;
  } else {
    this.analytics.dailyViews.push({
      date: today,
      count: 1,
    });
  }

  // Keep only last 30 days
  this.analytics.dailyViews = this.analytics.dailyViews
    .sort((a, b) => b.date - a.date)
    .slice(0, 30);

  return this.save();
};

poemSchema.methods.addLike = function (userId) {
  // Remove dislike if exists
  this.dislikes = this.dislikes.filter((d) => !d.user.equals(userId));

  // Add like if not already liked
  if (!this.likes.some((l) => l.user.equals(userId))) {
    this.likes.push({ user: userId });
  }

  return this.save();
};

poemSchema.methods.addDislike = function (userId) {
  // Remove like if exists
  this.likes = this.likes.filter((l) => !l.user.equals(userId));

  // Add dislike if not already disliked
  if (!this.dislikes.some((d) => d.user.equals(userId))) {
    this.dislikes.push({ user: userId });
  }

  return this.save();
};

poemSchema.methods.addRating = function (userId, rating, review = "") {
  // Remove existing rating
  this.ratings = this.ratings.filter((r) => !r.user.equals(userId));

  // Add new rating
  this.ratings.push({
    user: userId,
    rating,
    review,
  });

  return this.save();
};

const Poem = mongoose.models.Poem || mongoose.model("Poem", poemSchema);

export default Poem;
