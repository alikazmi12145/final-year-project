import mongoose from "mongoose";

// ==============================================
// Post Model - News Feed Posts
// Supports literary events, poetry launches, and contest announcements
// ==============================================
const postSchema = new mongoose.Schema(
  {
    // Post title (required)
    title: {
      type: String,
      required: [true, "عنوان ضروری ہے"],
      trim: true,
      maxlength: [200, "عنوان 200 حروف سے زیادہ نہیں ہو سکتا"],
    },

    // Post description / body content
    description: {
      type: String,
      required: [true, "تفصیل ضروری ہے"],
      maxlength: [5000, "تفصیل 5000 حروف سے زیادہ نہیں ہو سکتی"],
    },

    // Category of the post
    category: {
      type: String,
      enum: ["event", "poetry", "contest"],
      required: [true, "زمرہ ضروری ہے"],
    },

    // Optional featured image
    image: {
      url: { type: String },
      publicId: { type: String },
    },

    // Admin who created the post
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Likes array - tracks which users liked the post
    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        likedAt: { type: Date, default: Date.now },
      },
    ],

    // Reports array - tracks user reports for moderation
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

    // Publishing status
    status: {
      type: String,
      enum: ["published", "archived", "flagged"],
      default: "published",
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Indexes for efficient querying
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ createdBy: 1 });
postSchema.index({ title: "text", description: "text" }); // text search

export default mongoose.model("Post", postSchema);
