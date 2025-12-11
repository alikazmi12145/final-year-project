import mongoose from "mongoose";

/**
 * Reading History Schema
 * Tracks poems read by users with timestamps
 */
const readingHistorySchema = new mongoose.Schema(
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
    readAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one history entry per user-poem pair
readingHistorySchema.index({ user: 1, poem: 1 }, { unique: true });

// Index for sorting by read date
readingHistorySchema.index({ user: 1, readAt: -1 });

/**
 * Static method to add or update reading history
 */
readingHistorySchema.statics.addOrUpdate = async function (userId, poemId) {
  const result = await this.findOneAndUpdate(
    { user: userId, poem: poemId },
    {
      $set: { readAt: new Date() },
      $inc: { readCount: 1 },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  // Trim history to last 200 entries for this user
  await this.trimUserHistory(userId, 200);

  return result;
};

/**
 * Static method to trim user history to specified limit
 */
readingHistorySchema.statics.trimUserHistory = async function (
  userId,
  limit = 200
) {
  const total = await this.countDocuments({ user: userId });

  if (total > limit) {
    // Get IDs of oldest entries to remove
    const entriesToRemove = await this.find({ user: userId })
      .sort({ readAt: 1 })
      .limit(total - limit)
      .select("_id");

    const idsToRemove = entriesToRemove.map((entry) => entry._id);

    await this.deleteMany({ _id: { $in: idsToRemove } });
  }
};

/**
 * Static method to get user's reading statistics
 */
readingHistorySchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPoems: { $sum: 1 },
        totalReads: { $sum: "$readCount" },
        lastRead: { $max: "$readAt" },
      },
    },
  ]);

  return stats[0] || { totalPoems: 0, totalReads: 0, lastRead: null };
};

const ReadingHistory = mongoose.model("ReadingHistory", readingHistorySchema);

export default ReadingHistory;
