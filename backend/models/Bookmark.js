import mongoose from "mongoose";

/**
 * Bookmark Schema
 * Stores user bookmarks for poems
 */
const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    poem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate bookmarks and optimize queries
bookmarkSchema.index({ user: 1, poem: 1 }, { unique: true });

// Index for sorting by creation date
bookmarkSchema.index({ user: 1, createdAt: -1 });

/**
 * Static method to check if poem is bookmarked
 */
bookmarkSchema.statics.isBookmarked = async function (userId, poemId) {
  const bookmark = await this.findOne({ user: userId, poem: poemId });
  return !!bookmark;
};

/**
 * Static method to get user's bookmark count
 */
bookmarkSchema.statics.getUserBookmarkCount = async function (userId) {
  return await this.countDocuments({ user: userId });
};

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

export default Bookmark;
