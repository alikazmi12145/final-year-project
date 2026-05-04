import mongoose from "mongoose";

/**
 * FraudReport Model
 * Users can report a poet/user they believe is fraudulent or impersonating.
 * Admins review and resolve reports.
 */
const fraudReportSchema = new mongoose.Schema(
  {
    // The user being reported
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The user submitting the report
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Reason category
    reason: {
      type: String,
      required: true,
      enum: [
        "impersonation",      // Pretending to be a known poet
        "fake_credentials",   // Falsified documents or credentials
        "plagiarism",         // Publishing others' work as their own
        "spam",               // Spamming or low-quality content
        "harassment",         // Harassing other users
        "other",              // Other reason
      ],
    },

    // Detailed description
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000,
    },

    // Evidence URLs (optional screenshots, links)
    evidenceUrls: [
      {
        type: String,
        trim: true,
      },
    ],

    // Review workflow
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },

    // Admin notes after review
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Prevent a user from submitting duplicate active reports against the same target
fraudReportSchema.index(
  { reportedUserId: 1, reportedBy: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("FraudReport", fraudReportSchema);
