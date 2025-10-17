import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // Basic Message Information
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "audio", "file", "poem", "system"],
      default: "text",
    },

    // Sender and Receiver
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipients: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: Date,
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Conversation Context
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Media Attachments
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "audio", "video", "document", "poem"],
        },
        url: String,
        publicId: String,
        filename: String,
        size: Number,
        mimeType: String,
        duration: Number, // for audio/video
      },
    ],

    // Poem Reference (if sharing a poem)
    sharedPoem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
    },

    // Message Status
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    originalContent: String,

    // Reactions
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Message Metadata
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    // Translation (for multi-language support)
    translations: [
      {
        language: String,
        content: String,
        translatedAt: Date,
        translatedBy: String, // service used for translation
      },
    ],

    // Moderation
    flagged: {
      type: Boolean,
      default: false,
    },
    flaggedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        flaggedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: Date,
    moderationAction: {
      type: String,
      enum: ["none", "warned", "edited", "deleted"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const conversationSchema = new mongoose.Schema(
  {
    // Conversation Type
    type: {
      type: String,
      enum: ["direct", "group", "support", "contest_discussion"],
      required: true,
    },

    // Participants
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["member", "admin", "moderator"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
        lastReadAt: {
          type: Date,
          default: Date.now,
        },
        notificationSettings: {
          muted: {
            type: Boolean,
            default: false,
          },
          mutedUntil: Date,
        },
      },
    ],

    // Group Information (for group conversations)
    groupInfo: {
      name: String,
      description: String,
      avatar: {
        url: String,
        publicId: String,
      },
      isPublic: {
        type: Boolean,
        default: false,
      },
      maxParticipants: {
        type: Number,
        default: 100,
      },
    },

    // Conversation Metadata
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    messageCount: {
      type: Number,
      default: 0,
    },

    // Contest Context (if related to a contest)
    relatedContest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
    },
    relatedPoem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poem",
    },

    // Status
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },

    // Moderation
    moderatedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Settings
    settings: {
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowPoemSharing: {
        type: Boolean,
        default: true,
      },
      moderationLevel: {
        type: String,
        enum: ["none", "basic", "strict"],
        default: "basic",
      },
      autoDeleteMessages: {
        enabled: Boolean,
        afterDays: Number,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "recipients.user": 1, "recipients.readAt": 1 });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1, status: 1 });
conversationSchema.index({ lastActivity: -1 });

// Virtual for unread count
conversationSchema.virtual("unreadCount").get(function () {
  // This would be calculated per user in the application logic
  return 0;
});

// Message methods
messageSchema.methods.markAsRead = function (userId) {
  const recipient = this.recipients.find((r) => r.user.equals(userId));
  if (recipient && !recipient.readAt) {
    recipient.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

messageSchema.methods.addReaction = function (userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter((r) => !r.user.equals(userId));

  // Add new reaction
  this.reactions.push({ user: userId, emoji });
  return this.save();
};

messageSchema.methods.removeReaction = function (userId) {
  this.reactions = this.reactions.filter((r) => !r.user.equals(userId));
  return this.save();
};

// Conversation methods
conversationSchema.methods.addParticipant = function (userId, role = "member") {
  const existingParticipant = this.participants.find((p) =>
    p.user.equals(userId)
  );

  if (!existingParticipant) {
    this.participants.push({ user: userId, role });
    return this.save();
  } else if (!existingParticipant.isActive) {
    existingParticipant.isActive = true;
    existingParticipant.joinedAt = new Date();
    existingParticipant.leftAt = null;
    return this.save();
  }

  return Promise.resolve(this);
};

conversationSchema.methods.removeParticipant = function (userId) {
  const participant = this.participants.find((p) => p.user.equals(userId));
  if (participant && participant.isActive) {
    participant.isActive = false;
    participant.leftAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

conversationSchema.methods.updateLastActivity = function (messageId = null) {
  this.lastActivity = new Date();
  this.messageCount += 1;
  if (messageId) {
    this.lastMessage = messageId;
  }
  return this.save();
};

conversationSchema.methods.getUnreadCount = function (userId) {
  const participant = this.participants.find((p) => p.user.equals(userId));
  if (!participant) return 0;

  // This would typically be calculated using an aggregation pipeline
  // For now, returning 0 as placeholder
  return 0;
};

export const Message = mongoose.model("Message", messageSchema);
export const Conversation = mongoose.model("Conversation", conversationSchema);
