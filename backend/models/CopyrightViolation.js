import mongoose from "mongoose";

/**
 * CopyrightViolation Model
 * An enforcement record created when an admin upholds a CopyrightReport.
 * Tracks the action taken against the violator.
 */
const copyrightViolationSchema = new mongoose.Schema(
  {
    violatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    poemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
      required: true,
      index: true,
    },

    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CopyrightReport",
      required: true,
    },

    // Enforcement action
    actionTaken: {
      type: String,
      enum: [
        "warning",
        "poem_unpublished",
        "poem_removed",
        "user_suspended",
        "user_banned",
      ],
      required: true,
    },

    // Free-form reason / admin notes
    reason: {
      type: String,
      maxlength: 2000,
    },

    // Suspension info (when actionTaken === user_suspended)
    suspensionStatus: {
      type: String,
      enum: ["none", "active", "expired", "lifted"],
      default: "none",
    },
    suspendedUntil: Date,

    // Admin who issued the action
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Whether the violator has acknowledged seeing this in their dashboard
    seenByViolator: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

copyrightViolationSchema.index({ violatorId: 1, createdAt: -1 });

export default mongoose.model(
  "CopyrightViolation",
  copyrightViolationSchema
);
