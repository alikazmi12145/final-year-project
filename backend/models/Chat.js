import mongoose from "mongoose";

// 💬 Chat Model for Direct Messaging and Group Chats
const chatSchema = new mongoose.Schema(
  {
    // Basic Chat Information
    chatType: {
      type: String,
      enum: ["direct", "group", "support"],
      required: true,
      default: "direct",
    },

    // Chat Name (for group chats)
    chatName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Chat Description (for group chats)
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Participants in the chat
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member", "moderator"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        // Last read message timestamp for unread count
        lastReadAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Group Chat Settings (only for group chats)
    groupSettings: {
      isPrivate: {
        type: Boolean,
        default: false,
      },
      allowMemberInvite: {
        type: Boolean,
        default: true,
      },
      maxMembers: {
        type: Number,
        default: 50,
      },
    },

    // Last Message Reference
    lastMessage: {
      message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      timestamp: Date,
      preview: String, // First 100 chars of last message
    },

    // Chat Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Archive status for participants
    archivedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        archivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Chat Statistics
    stats: {
      totalMessages: { type: Number, default: 0 },
      totalMembers: { type: Number, default: 0 },
    },

    // Poetry-specific metadata
    poetryContext: {
      relatedPoem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poem",
      },
      relatedPoet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poet",
      },
      relatedContest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contest",
      },
      topic: String, // e.g., "غزل discussion", "نظم feedback"
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
chatSchema.index({ "participants.user": 1, isActive: 1 });
chatSchema.index({ chatType: 1, isActive: 1 });
chatSchema.index({ "lastMessage.timestamp": -1 });
chatSchema.index({ createdAt: -1 });

// Virtual for unread messages count (will be calculated in queries)
chatSchema.virtual("unreadCount").get(function () {
  return this._unreadCount || 0;
});

// Methods
chatSchema.methods.addParticipant = function (userId, role = "member") {
  const existingParticipant = this.participants.find(
    (p) => p.user.toString() === userId.toString()
  );

  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true,
    });
    this.stats.totalMembers = this.participants.filter(
      (p) => p.isActive
    ).length;
  }

  return this.save();
};

chatSchema.methods.removeParticipant = function (userId) {
  const participantIndex = this.participants.findIndex(
    (p) => p.user.toString() === userId.toString()
  );

  if (participantIndex > -1) {
    this.participants[participantIndex].isActive = false;
    this.stats.totalMembers = this.participants.filter(
      (p) => p.isActive
    ).length;
  }

  return this.save();
};

chatSchema.methods.updateLastMessage = function (messageId, preview) {
  this.lastMessage = {
    message: messageId,
    timestamp: new Date(),
    preview: preview.substring(0, 100),
  };
  this.stats.totalMessages += 1;

  return this.save();
};

// Pre-save middleware
chatSchema.pre("save", function (next) {
  if (this.chatType === "direct" && this.participants.length > 2) {
    next(new Error("Direct chat can only have 2 participants"));
  } else if (this.chatType === "group" && !this.chatName) {
    next(new Error("Group chat must have a name"));
  } else {
    this.stats.totalMembers = this.participants.filter(
      (p) => p.isActive
    ).length;
    next();
  }
});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
