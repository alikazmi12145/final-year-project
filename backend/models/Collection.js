import mongoose from "mongoose";

/**
 * Collection Schema for organizing poems into user-curated collections
 * Supports favorites, reading lists, and custom collections
 */

const CollectionSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "مجموعہ کا نام ضروری ہے"], // "Collection name is required" in Urdu
      trim: true,
      maxlength: [100, "مجموعہ کا نام 100 حروف سے زیادہ نہیں ہو سکتا"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "تفصیل 500 حروف سے زیادہ نہیں ہو سکتی"],
    },

    // Owner Information
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Collection Type
    type: {
      type: String,
      enum: ["favorites", "reading_list", "custom", "shared", "contest"],
      default: "custom",
    },

    // Collection Settings
    visibility: {
      type: String,
      enum: ["public", "private", "friends", "followers"],
      default: "private",
    },

    isSystemGenerated: {
      type: Boolean,
      default: false, // For favorites and reading lists
    },

    // Poems in Collection
    poems: [
      {
        poem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Poem",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: {
          type: String,
          maxlength: 200,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Collection Metadata
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 30,
      },
    ],

    category: {
      type: String,
      enum: [
        "romantic",
        "spiritual",
        "classical",
        "modern",
        "ghazal",
        "nazm",
        "patriotic",
        "sad",
        "motivational",
        "educational",
        "contest",
        "other",
      ],
    },

    // Cover and Presentation
    coverImage: {
      url: String,
      publicId: String,
    },

    theme: {
      color: {
        type: String,
        default: "#4A5568",
      },
      pattern: {
        type: String,
        enum: ["geometric", "floral", "calligraphy", "minimal"],
        default: "minimal",
      },
    },

    // Collaboration
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["editor", "viewer", "contributor"],
          default: "viewer",
        },
        invitedAt: {
          type: Date,
          default: Date.now,
        },
        acceptedAt: Date,
      },
    ],

    // Social Features
    followers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        followedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

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

    // Analytics
    views: {
      type: Number,
      default: 0,
    },

    analytics: {
      totalViews: { type: Number, default: 0 },
      uniqueViewers: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          firstView: { type: Date, default: Date.now },
          lastView: { type: Date, default: Date.now },
          viewCount: { type: Number, default: 1 },
        },
      ],
      shareCount: { type: Number, default: 0 },
      averageTimeSpent: { type: Number, default: 0 }, // in seconds
    },

    // Publication
    publishedAt: Date,
    lastModified: {
      type: Date,
      default: Date.now,
    },

    // System Features
    isFeatured: {
      type: Boolean,
      default: false,
    },

    featuredAt: Date,

    // Search and Discovery
    searchKeywords: [String],

    // Ordering and Sorting
    defaultSort: {
      type: String,
      enum: ["manual", "date_added", "alphabetical", "rating", "popularity"],
      default: "manual",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
CollectionSchema.index({ user: 1, type: 1 });
CollectionSchema.index({ visibility: 1, publishedAt: -1 });
CollectionSchema.index({ tags: 1 });
CollectionSchema.index({ category: 1 });
CollectionSchema.index({ "poems.poem": 1 });
CollectionSchema.index({ isFeatured: 1, views: -1 });

// Virtual for poem count
CollectionSchema.virtual("poemCount").get(function () {
  return this.poems ? this.poems.length : 0;
});

// Virtual for follower count
CollectionSchema.virtual("followerCount").get(function () {
  return this.followers ? this.followers.length : 0;
});

// Virtual for like count
CollectionSchema.virtual("likesCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for formatted creation date in Urdu
CollectionSchema.virtual("createdAtUrdu").get(function () {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "islamic-umalqura",
  };
  return this.createdAt.toLocaleDateString("ur-PK", options);
});

// Pre-save middleware
CollectionSchema.pre("save", function (next) {
  // Update search keywords
  if (this.isModified("name") || this.isModified("description")) {
    this.searchKeywords = [];

    if (this.name) {
      this.searchKeywords.push(...this.name.toLowerCase().split(/\s+/));
    }

    if (this.description) {
      this.searchKeywords.push(...this.description.toLowerCase().split(/\s+/));
    }

    if (this.tags && this.tags.length > 0) {
      this.searchKeywords.push(...this.tags);
    }

    // Remove duplicates and filter out empty strings
    this.searchKeywords = [
      ...new Set(this.searchKeywords.filter((keyword) => keyword.length > 2)),
    ];
  }

  // Update lastModified
  if (
    this.isModified("poems") ||
    this.isModified("name") ||
    this.isModified("description")
  ) {
    this.lastModified = new Date();
  }

  // Set published date for public collections
  if (
    this.isModified("visibility") &&
    this.visibility === "public" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

// Static methods
CollectionSchema.statics.getUserFavorites = function (userId) {
  return this.findOne({
    user: userId,
    type: "favorites",
    isSystemGenerated: true,
  });
};

CollectionSchema.statics.getUserReadingList = function (userId) {
  return this.findOne({
    user: userId,
    type: "reading_list",
    isSystemGenerated: true,
  });
};

CollectionSchema.statics.getPublicCollections = function (
  limit = 20,
  page = 1
) {
  const skip = (page - 1) * limit;

  return this.find({
    visibility: "public",
    "poems.0": { $exists: true }, // Has at least one poem
  })
    .populate("user", "name profilePicture")
    .populate("poems.poem", "title author averageRating views")
    .sort({ views: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit);
};

CollectionSchema.statics.getFeaturedCollections = function (limit = 10) {
  return this.find({
    isFeatured: true,
    visibility: "public",
    "poems.0": { $exists: true },
  })
    .populate("user", "name profilePicture")
    .populate("poems.poem", "title author averageRating")
    .sort({ featuredAt: -1 })
    .limit(limit);
};

CollectionSchema.statics.searchCollections = function (query, filters = {}) {
  const searchConditions = {
    visibility: "public",
    "poems.0": { $exists: true },
  };

  if (query) {
    searchConditions.$or = [
      { name: new RegExp(query, "i") },
      { description: new RegExp(query, "i") },
      { searchKeywords: { $in: [new RegExp(query, "i")] } },
    ];
  }

  if (filters.category) {
    searchConditions.category = filters.category;
  }

  if (filters.tags && filters.tags.length > 0) {
    searchConditions.tags = { $in: filters.tags };
  }

  return this.find(searchConditions)
    .populate("user", "name profilePicture")
    .populate("poems.poem", "title author averageRating views")
    .sort({ views: -1, publishedAt: -1 });
};

// Instance methods
CollectionSchema.methods.addPoem = function (
  poemId,
  userId,
  notes = "",
  order = null
) {
  // Check if poem already exists in collection
  const existingPoem = this.poems.find(
    (p) => p.poem.toString() === poemId.toString()
  );

  if (existingPoem) {
    throw new Error("یہ شاعری پہلے سے موجود ہے"); // "This poem already exists"
  }

  // Set order if not provided
  if (order === null) {
    order = this.poems.length;
  }

  this.poems.push({
    poem: poemId,
    addedBy: userId,
    notes: notes,
    order: order,
  });

  return this.save();
};

CollectionSchema.methods.removePoem = function (poemId) {
  this.poems = this.poems.filter(
    (p) => p.poem.toString() !== poemId.toString()
  );

  // Reorder remaining poems
  this.poems.forEach((poem, index) => {
    poem.order = index;
  });

  return this.save();
};

CollectionSchema.methods.reorderPoems = function (newOrder) {
  // newOrder should be an array of poem IDs in the desired order
  const reorderedPoems = [];

  newOrder.forEach((poemId, index) => {
    const poem = this.poems.find(
      (p) => p.poem.toString() === poemId.toString()
    );
    if (poem) {
      poem.order = index;
      reorderedPoems.push(poem);
    }
  });

  this.poems = reorderedPoems;
  return this.save();
};

CollectionSchema.methods.addFollower = function (userId) {
  const existingFollower = this.followers.find(
    (f) => f.user.toString() === userId.toString()
  );

  if (!existingFollower) {
    this.followers.push({ user: userId });
  }

  return this.save();
};

CollectionSchema.methods.removeFollower = function (userId) {
  this.followers = this.followers.filter(
    (f) => f.user.toString() !== userId.toString()
  );
  return this.save();
};

CollectionSchema.methods.toggleLike = function (userId) {
  const existingLike = this.likes.find(
    (l) => l.user.toString() === userId.toString()
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

CollectionSchema.methods.incrementView = function (userId = null) {
  this.views += 1;
  this.analytics.totalViews += 1;

  if (userId) {
    // Track unique viewer
    let viewer = this.analytics.uniqueViewers.find(
      (v) => v.user.toString() === userId.toString()
    );

    if (viewer) {
      viewer.viewCount += 1;
      viewer.lastView = new Date();
    } else {
      this.analytics.uniqueViewers.push({
        user: userId,
        firstView: new Date(),
        lastView: new Date(),
        viewCount: 1,
      });
    }
  }

  return this.save();
};

CollectionSchema.methods.addCollaborator = function (userId, role = "viewer") {
  const existingCollaborator = this.collaborators.find(
    (c) => c.user.toString() === userId.toString()
  );

  if (existingCollaborator) {
    existingCollaborator.role = role;
  } else {
    this.collaborators.push({
      user: userId,
      role: role,
    });
  }

  return this.save();
};

CollectionSchema.methods.removeCollaborator = function (userId) {
  this.collaborators = this.collaborators.filter(
    (c) => c.user.toString() !== userId.toString()
  );
  return this.save();
};

const Collection =
  mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);

export default Collection;
