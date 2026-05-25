import mongoose from "mongoose";

/**
 * CopyrightReport Model
 * A user reports a poem they believe infringes copyright (plagiarism, unauthorized
 * republishing, license violation, etc.). Admins review and dispatch a
 * CopyrightViolation if upheld.
 */
const copyrightReportSchema = new mongoose.Schema(
  {
    // Reporter
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The poem allegedly infringing
    poemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
      required: true,
      index: true,
    },

    // Author of the reported poem (denormalized for fast queries)
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional reference to the alleged original poem inside our platform
    originalPoemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
    },

    // Categorised reason
    reason: {
      type: String,
      required: true,
      enum: [
        "plagiarism",
        "unauthorized_reproduction",
        "license_violation",
        "false_attribution",
        "derivative_without_permission",
        "other",
      ],
      index: true,
    },

    // Free-form description from the reporter
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000,
    },

    // Evidence links (original publication, screenshots, archives, etc.)
    evidenceLinks: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],

    // Similarity score computed at submission time (0..1)
    similarityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    // Review workflow
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "withdrawn"],
      default: "pending",
      index: true,
    },

    // Admin who reviewed
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,

    // Notes appended by admin during review (timeline)
    adminNotes: {
      type: String,
      maxlength: 2000,
    },

    // Timeline of every status change (used by the user-facing status page)
    timeline: [
      {
        status: {
          type: String,
          enum: ["pending", "under_review", "approved", "rejected", "withdrawn"],
        },
        note: { type: String, maxlength: 500 },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],

    // If the report led to an enforcement action
    violationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CopyrightViolation",
    },
  },
  { timestamps: true }
);

// Prevent a single user from filing multiple pending reports on the same poem
copyrightReportSchema.index(
  { reporterId: 1, poemId: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "under_review"] } } }
);

export default mongoose.model("CopyrightReport", copyrightReportSchema);
