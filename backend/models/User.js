import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        // Password not required for OAuth users
        return (
          !this.oauth.google.id &&
          !this.oauth.facebook.id &&
          !this.oauth.github.id
        );
      },
      minlength: 6,
    },

    // OAuth Information
    oauth: {
      google: {
        id: String,
        email: String,
      },
      facebook: {
        id: String,
        email: String,
      },
      github: {
        id: String,
        username: String,
        email: String,
      },
    },

    // Role & Verification
    role: {
      type: String,
      enum: ["poet", "admin", "moderator"],
      default: "poet",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationBadge: {
      type: String,
      enum: ["none", "bronze", "silver", "gold", "diamond"],
      default: "none",
    },

    // Profile Information
    profileImage: {
      url: String,
      publicId: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    location: {
      city: String,
      country: String,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    // Social Links
    socialLinks: {
      website: String,
      facebook: String,
      twitter: String,
      instagram: String,
      youtube: String,
    },

    // Preferences
    preferences: {
      language: {
        type: String,
        enum: ["urdu", "english", "both"],
        default: "urdu",
      },
      theme: {
        type: String,
        enum: ["light", "dark", "cultural"],
        default: "cultural",
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        contests: { type: Boolean, default: true },
        newPoetry: { type: Boolean, default: true },
      },
    },

    // Activity Tracking
    lastActive: {
      type: Date,
      default: Date.now,
    },
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        loginTime: { type: Date, default: Date.now },
      },
    ],

    // Bookmarks & History
    bookmarkedPoems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poem",
      },
    ],
    readingHistory: [
      {
        poem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Poem",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Social Connections
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Engagement Stats
    stats: {
      poemsRead: { type: Number, default: 0 },
      contestsParticipated: { type: Number, default: 0 },
      quizzesCompleted: { type: Number, default: 0 },
      commentsPosted: { type: Number, default: 0 },
      likesGiven: { type: Number, default: 0 },
    },

    // Account Status
    status: {
      type: String,
      enum: ["active", "suspended", "banned", "pending"],
      default: "pending",
    },
    suspensionReason: String,
    suspendedUntil: Date,

    // Verification Process
    verificationRequest: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      submittedAt: Date,
      documents: [
        {
          type: String,
          url: String,
        },
      ],
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      reviewNotes: String,
    },

    // Email Verification
    emailVerification: {
      isVerified: { type: Boolean, default: false },
      token: String,
      expiresAt: Date,
    },

    // Password Reset
    passwordReset: {
      token: String,
      expiresAt: Date,
      usedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance (removed duplicates to fix warnings)
userSchema.index({ role: 1, status: 1 });
userSchema.index({ "verificationRequest.status": 1 });
userSchema.index({ lastActive: -1 });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return this.name;
});

// Virtual for verification status
userSchema.virtual("isFullyVerified").get(function () {
  return (
    this.isVerified &&
    this.emailVerification.isVerified &&
    this.status === "active"
  );
});

// Pre-save middleware to update lastActive
userSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastActive = new Date();
  }
  next();
});

// Methods
userSchema.methods.updateReadingHistory = function (poemId) {
  // Remove existing entry if present
  this.readingHistory = this.readingHistory.filter(
    (entry) => !entry.poem.equals(poemId)
  );

  // Add new entry at the beginning
  this.readingHistory.unshift({
    poem: poemId,
    readAt: new Date(),
  });

  // Limit to last 100 entries
  if (this.readingHistory.length > 100) {
    this.readingHistory = this.readingHistory.slice(0, 100);
  }

  this.stats.poemsRead += 1;
  return this.save();
};

userSchema.methods.addBookmark = function (poemId) {
  if (!this.bookmarkedPoems.includes(poemId)) {
    this.bookmarkedPoems.push(poemId);
    return this.save();
  }
  return Promise.resolve(this);
};

userSchema.methods.removeBookmark = function (poemId) {
  this.bookmarkedPoems = this.bookmarkedPoems.filter(
    (id) => !id.equals(poemId)
  );
  return this.save();
};

// Follow/Unfollow methods
userSchema.methods.followUser = async function (userIdToFollow) {
  if (!this.following.includes(userIdToFollow)) {
    this.following.push(userIdToFollow);
    await this.save();

    // Add this user to the other user's followers
    const userToFollow = await mongoose.model("User").findById(userIdToFollow);
    if (userToFollow && !userToFollow.followers.includes(this._id)) {
      userToFollow.followers.push(this._id);
      await userToFollow.save();
    }
  }
  return this;
};

userSchema.methods.unfollowUser = async function (userIdToUnfollow) {
  this.following = this.following.filter((id) => !id.equals(userIdToUnfollow));
  await this.save();

  // Remove this user from the other user's followers
  const userToUnfollow = await mongoose
    .model("User")
    .findById(userIdToUnfollow);
  if (userToUnfollow) {
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => !id.equals(this._id)
    );
    await userToUnfollow.save();
  }
  return this;
};

export default mongoose.model("User", userSchema);
