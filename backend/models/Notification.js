import mongoose from "mongoose";

// ==============================================
// Notification Model - User Notifications
// Supports new posts, comment replies, and admin announcements
// ==============================================
const notificationSchema = new mongoose.Schema(
  {
    // Target user who receives the notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Notification message text
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Notification type for filtering
    type: {
      type: String,
      enum: ["post", "comment", "admin"],
      required: true,
    },

    // Read/unread status
    read: {
      type: Boolean,
      default: false,
    },

    // Optional reference to related document
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Model name of the related document (for population)
    relatedModel: {
      type: String,
      enum: ["Post", "Comment", null],
      default: null,
    },
  },
  {
    timestamps: true, // createdAt serves as the timestamp
  }
);

// Indexes for fast notification queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });

export default mongoose.model("Notification", notificationSchema);
