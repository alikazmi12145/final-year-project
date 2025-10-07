import mongoose from "mongoose";

/**
 * Review Schema for Poetry Collection
 * Handles detailed reviews, ratings, and feedback for poems
 */

const ReviewSchema = new mongoose.Schema(
  {
    // Basic Information
    poem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Review Content
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: function (v) {
          return v >= 1 && v <= 5;
        },
        message: "ریٹنگ 1 سے 5 کے درمیان ہونی چاہیے", // "Rating should be between 1 and 5" in Urdu
      },
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "جائزہ کا عنوان 100 حروف سے زیادہ نہیں ہو سکتا"], // "Review title cannot be more than 100 characters"
    },

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "جائزہ کم از کم 10 حروف کا ہونا چاہیے"], // "Review must be at least 10 characters"
      maxlength: [2000, "جائزہ 2000 حروف سے زیادہ نہیں ہو سکتا"], // "Review cannot be more than 2000 characters"
    },

    // Review Categories (specific to Urdu poetry)
    categories: {
      literary: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      }, // Literary quality
      emotional: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      }, // Emotional impact
      linguistic: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      }, // Language and style
      cultural: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      }, // Cultural relevance
      originality: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      }, // Originality and creativity
    },

    // Interaction and Engagement
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

    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status and Moderation
    status: {
      type: String,
      enum: ["active", "hidden", "reported", "deleted"],
      default: "active",
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: Date,

    // Helpful votes
    helpfulVotes: {
      helpful: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          votedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      notHelpful: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          votedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Moderation
    reportedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          enum: ["inappropriate", "spam", "offensive", "irrelevant", "other"],
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    moderationNotes: String,
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure one review per user per poem
ReviewSchema.index({ poem: 1, user: 1 }, { unique: true });

// Other indexes for performance
ReviewSchema.index({ poem: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ status: 1 });

// Virtual for overall average from categories
ReviewSchema.virtual("categoricalAverage").get(function () {
  const categories = this.categories;
  const total =
    categories.literary +
    categories.emotional +
    categories.linguistic +
    categories.cultural +
    categories.originality;
  return Math.round((total / 5) * 10) / 10; // Round to 1 decimal place
});

// Virtual for like count
ReviewSchema.virtual("likesCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for helpful votes count
ReviewSchema.virtual("helpfulCount").get(function () {
  return this.helpfulVotes.helpful ? this.helpfulVotes.helpful.length : 0;
});

ReviewSchema.virtual("notHelpfulCount").get(function () {
  return this.helpfulVotes.notHelpful ? this.helpfulVotes.notHelpful.length : 0;
});

// Virtual for net helpfulness score
ReviewSchema.virtual("helpfulnessScore").get(function () {
  return this.helpfulCount - this.notHelpfulCount;
});

// Virtual for formatted date in Urdu
ReviewSchema.virtual("createdAtUrdu").get(function () {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "islamic-umalqura",
  };
  return this.createdAt.toLocaleDateString("ur-PK", options);
});

// Pre-save middleware
ReviewSchema.pre("save", function (next) {
  // Mark as edited if content is modified (except for first save)
  if (this.isModified("content") && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  next();
});

// Static methods
ReviewSchema.statics.getAverageRating = function (poemId) {
  return this.aggregate([
    { $match: { poem: poemId, status: "active" } },
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
};

ReviewSchema.statics.getUserReview = function (poemId, userId) {
  return this.findOne({ poem: poemId, user: userId, status: "active" });
};

ReviewSchema.statics.getTopReviews = function (poemId, limit = 5) {
  return this.find({ poem: poemId, status: "active" })
    .populate("user", "name profilePicture")
    .sort({ helpfulnessScore: -1, likesCount: -1, createdAt: -1 })
    .limit(limit);
};

// Instance methods
ReviewSchema.methods.addLike = function (userId) {
  const existingLike = this.likes.find(
    (like) => like.user.toString() === userId.toString()
  );

  if (existingLike) {
    // Remove like
    this.likes.pull({ _id: existingLike._id });
  } else {
    // Add like
    this.likes.push({ user: userId });
  }

  return this.save();
};

ReviewSchema.methods.addReply = function (userId, content) {
  this.replies.push({
    user: userId,
    content: content.trim(),
  });

  return this.save();
};

ReviewSchema.methods.markHelpful = function (userId, isHelpful = true) {
  // Remove from both arrays first
  this.helpfulVotes.helpful = this.helpfulVotes.helpful.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );
  this.helpfulVotes.notHelpful = this.helpfulVotes.notHelpful.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );

  // Add to appropriate array
  if (isHelpful) {
    this.helpfulVotes.helpful.push({ user: userId });
  } else {
    this.helpfulVotes.notHelpful.push({ user: userId });
  }

  return this.save();
};

ReviewSchema.methods.reportReview = function (userId, reason) {
  // Check if already reported by this user
  const existingReport = this.reportedBy.find(
    (report) => report.user.toString() === userId.toString()
  );

  if (!existingReport) {
    this.reportedBy.push({
      user: userId,
      reason: reason,
    });

    // Auto-hide if reported by multiple users (threshold: 3)
    if (this.reportedBy.length >= 3) {
      this.status = "reported";
    }
  }

  return this.save();
};

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

export default Review;
