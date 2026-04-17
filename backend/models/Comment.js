import mongoose from "mongoose";

// ==============================================
// Comment Model - Comments on News Feed Posts
// Supports nested replies and reporting
// ==============================================
const commentSchema = new mongoose.Schema(
  {
    // Reference to the parent post
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    // User who wrote the comment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Comment text content
    content: {
      type: String,
      required: [true, "تبصرہ خالی نہیں ہو سکتا"],
      trim: true,
      maxlength: [1000, "تبصرہ 1000 حروف سے زیادہ نہیں ہو سکتا"],
    },

    // Optional parent comment for replies
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // Likes on this comment
    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        likedAt: { type: Date, default: Date.now },
      },
    ],

    // Reports for moderation
    reports: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: {
          type: String,
          required: true,
          maxlength: 500,
        },
        reportedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      },
    ],

    // Moderation status
    status: {
      type: String,
      enum: ["active", "hidden", "flagged"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ status: 1 });

export default mongoose.model("Comment", commentSchema);
