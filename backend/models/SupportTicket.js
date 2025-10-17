import mongoose from "mongoose";

// 🎫 Support Ticket Model for Contact Support System
const supportTicketSchema = new mongoose.Schema(
  {
    // Ticket Basic Information
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },

    // User Information
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Contact Information (for non-registered users)
    contactInfo: {
      name: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },

    // Ticket Content
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    // Ticket Category and Priority
    category: {
      type: String,
      enum: [
        "technical", // تکنیکی مسائل
        "account", // اکاؤنٹ کے مسائل
        "poetry", // شاعری سے متعلق
        "payment", // ادائیگی کے مسائل
        "content", // مواد کے مسائل
        "suggestion", // تجاویز
        "complaint", // شکایات
        "general", // عام سوالات
      ],
      required: true,
      default: "general",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Ticket Status
    status: {
      type: String,
      enum: [
        "open", // کھلا
        "in_progress", // جاری
        "waiting_customer", // صارف کا انتظار
        "resolved", // حل ہو گیا
        "closed", // بند
        "escalated", // اوپر بھیجا گیا
      ],
      default: "open",
    },

    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin or support staff
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedAt: Date,

    // Ticket Timeline
    timeline: [
      {
        action: {
          type: String,
          enum: [
            "created",
            "assigned",
            "status_changed",
            "priority_changed",
            "replied",
            "escalated",
            "resolved",
            "closed",
          ],
        },
        description: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        previousValue: String,
        newValue: String,
      },
    ],

    // Attachments
    attachments: [
      {
        filename: String,
        url: String,
        publicId: String,
        fileType: String,
        fileSize: Number,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Responses/Replies
    replies: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 5000,
        },
        isInternal: {
          type: Boolean,
          default: false, // Internal notes between support staff
        },
        attachments: [
          {
            filename: String,
            url: String,
            publicId: String,
          },
        ],
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Resolution Information
    resolution: {
      summary: String,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      resolvedAt: Date,
      resolutionTime: Number, // in minutes
      customerSatisfaction: {
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        feedback: String,
        ratedAt: Date,
      },
    },

    // Metadata
    tags: [String],

    // SLA Information
    sla: {
      responseTime: Number, // in hours
      resolutionTime: Number, // in hours
      firstResponseAt: Date,
      escalationTime: Date,
    },

    // Statistics
    stats: {
      viewCount: { type: Number, default: 0 },
      replyCount: { type: Number, default: 0 },
      escalationCount: { type: Number, default: 0 },
    },

    // Cultural Context (for Urdu platform)
    language: {
      type: String,
      enum: ["urdu", "english", "mixed"],
      default: "urdu",
    },

    // Auto-generated fields
    closedAt: Date,
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ category: 1, priority: 1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ lastActivityAt: -1 });

// Virtual for time since creation
supportTicketSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt;
});

// Virtual for response time
supportTicketSchema.virtual("responseTimeHours").get(function () {
  if (this.sla.firstResponseAt) {
    return Math.round(
      (this.sla.firstResponseAt - this.createdAt) / (1000 * 60 * 60)
    );
  }
  return null;
});

// Pre-validate middleware to generate ticket ID (runs before validation)
supportTicketSchema.pre("validate", function (next) {
  try {
    if (this.isNew && !this.ticketId) {
      // Generate unique ticketId using timestamp and random number
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, "0");
      this.ticketId = `BZM-${timestamp}-${random}`;

      // Add creation timeline entry
      this.timeline.push({
        action: "created",
        description: "Ticket created",
        performedBy: this.user || null,
        timestamp: new Date(),
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for other updates
supportTicketSchema.pre("save", function (next) {
  try {
    // Update reply count
    this.stats.replyCount = this.replies.length;

    // Update last activity
    this.lastActivityAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
});

// Methods
supportTicketSchema.methods.addReply = function (
  authorId,
  content,
  isInternal = false,
  attachments = []
) {
  this.replies.push({
    author: authorId,
    content: content,
    isInternal: isInternal,
    attachments: attachments,
    timestamp: new Date(),
  });

  // Update timeline
  this.timeline.push({
    action: "replied",
    description: isInternal ? "Internal note added" : "Reply added",
    performedBy: authorId,
    timestamp: new Date(),
  });

  // Set first response time if this is the first response
  if (!this.sla.firstResponseAt && !isInternal) {
    this.sla.firstResponseAt = new Date();
  }

  return this.save();
};

supportTicketSchema.methods.changeStatus = function (
  newStatus,
  userId,
  reason = ""
) {
  const oldStatus = this.status;
  this.status = newStatus;

  // Add timeline entry
  this.timeline.push({
    action: "status_changed",
    description: reason || `Status changed from ${oldStatus} to ${newStatus}`,
    performedBy: userId,
    previousValue: oldStatus,
    newValue: newStatus,
    timestamp: new Date(),
  });

  // Set resolution time if resolved
  if (newStatus === "resolved" && !this.resolution.resolvedAt) {
    this.resolution.resolvedAt = new Date();
    this.resolution.resolvedBy = userId;
    this.resolution.resolutionTime = Math.round(
      (Date.now() - this.createdAt) / (1000 * 60)
    );
  }

  // Set closed time if closed
  if (newStatus === "closed") {
    this.closedAt = new Date();
  }

  return this.save();
};

supportTicketSchema.methods.assignTo = function (assigneeId, assignerId) {
  this.assignedTo = assigneeId;
  this.assignedBy = assignerId;
  this.assignedAt = new Date();

  this.timeline.push({
    action: "assigned",
    description: "Ticket assigned",
    performedBy: assignerId,
    timestamp: new Date(),
  });

  return this.save();
};

supportTicketSchema.methods.escalate = function (userId, reason = "") {
  this.priority = "urgent";
  this.status = "escalated";
  this.stats.escalationCount += 1;

  this.timeline.push({
    action: "escalated",
    description: reason || "Ticket escalated due to SLA breach",
    performedBy: userId,
    timestamp: new Date(),
  });

  return this.save();
};

// Static methods
supportTicketSchema.statics.getTicketStats = async function (filter = {}) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        avgResponseTime: { $avg: "$sla.responseTime" },
        avgResolutionTime: { $avg: "$resolution.resolutionTime" },
      },
    },
  ]);
};

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
