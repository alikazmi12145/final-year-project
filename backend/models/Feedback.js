import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Feedback can be for a contest or a quiz
    targetType: {
      type: String,
      enum: ["contest", "quiz"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// One feedback per user per target
feedbackSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
feedbackSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("Feedback", feedbackSchema);
