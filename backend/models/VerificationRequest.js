import mongoose from "mongoose";

/**
 * VerificationRequest Model
 * Stores standalone poet verification requests submitted by users.
 * When approved, the User document is updated: isVerified=true, verificationBadge='gold'.
 */
const verificationRequestSchema = new mongoose.Schema(
  {
    // Reference to the applying user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Personal & pen details
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    penName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Identity document URL (uploaded to Cloudinary or direct URL)
    nationalIdDocumentUrl: {
      type: String,
      trim: true,
    },

    // Social / literary profile links
    socialLinks: [
      {
        platform: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],

    // Sample poetry the applicant provides
    samplePoetry: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 5000,
    },

    // Additional statement or bio
    statement: {
      type: String,
      maxlength: 1000,
    },

    // Workflow status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Admin response
    adminRemarks: {
      type: String,
      maxlength: 1000,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index: one active (pending) request per user at a time
verificationRequestSchema.index(
  { userId: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("VerificationRequest", verificationRequestSchema);
