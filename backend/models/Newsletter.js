import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: ["footer", "popup", "landing", "other"],
      default: "footer",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ isActive: 1 });

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;
