import mongoose from "mongoose";

// ==============================================
// General Feedback Model - Platform Feedback from Users
// Separate from the existing contest/quiz Feedback model
// ==============================================
const generalFeedbackSchema = new mongoose.Schema(
  {
    // Submitter name (supports anonymous or logged-in users)
    name: {
      type: String,
      required: [true, "نام ضروری ہے"],
      trim: true,
      maxlength: 100,
    },

    // Submitter email
    email: {
      type: String,
      required: [true, "ای میل ضروری ہے"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "درست ای میل درج کریں"],
    },

    // Feedback message
    message: {
      type: String,
      required: [true, "پیغام ضروری ہے"],
      trim: true,
      maxlength: 2000,
    },

    // Rating 1–5
    rating: {
      type: Number,
      required: [true, "درجہ بندی ضروری ہے"],
      min: [1, "کم از کم درجہ بندی 1 ہے"],
      max: [5, "زیادہ سے زیادہ درجہ بندی 5 ہے"],
    },

    // Optional reference to logged-in user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for admin queries
generalFeedbackSchema.index({ createdAt: -1 });
generalFeedbackSchema.index({ rating: 1 });

export default mongoose.model("GeneralFeedback", generalFeedbackSchema);
