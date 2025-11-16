import mongoose from "mongoose";

// 🤖 Chatbot FAQ Model for automated assistance
const chatbotFAQSchema = new mongoose.Schema(
  {
    // Question Information
    question: {
      urdu: {
        type: String,
        required: true,
        trim: true,
      },
      english: {
        type: String,
        trim: true,
      },
    },

    // Answer Information
    answer: {
      urdu: {
        type: String,
        required: true,
      },
      english: {
        type: String,
      },
    },

    // Category for organizing FAQs
    category: {
      type: String,
      enum: [
        "navigation", // رہنمائی
        "account", // اکاؤنٹ
        "poetry", // شاعری
        "search", // تلاش
        "upload", // اپ لوڈ
        "contests", // مقابلے
        "technical", // تکنیکی
        "general", // عام
      ],
      required: true,
      default: "general",
    },

    // Keywords for matching user queries
    keywords: {
      urdu: [String],
      english: [String],
    },

    // Intent classification
    intent: {
      type: String,
      required: true,
    },

    // Related suggestions
    relatedQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatbotFAQ",
      },
    ],

    // Suggested actions/links
    suggestions: [
      {
        text: {
          urdu: String,
          english: String,
        },
        action: String, // "navigate", "link", "create"
        target: String, // URL or action identifier
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Priority for matching (higher = more important)
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    // Usage statistics
    stats: {
      viewCount: { type: Number, default: 0 },
      helpfulCount: { type: Number, default: 0 },
      notHelpfulCount: { type: Number, default: 0 },
      lastUsedAt: Date,
    },

    // Admin information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient searching
chatbotFAQSchema.index({ category: 1, isActive: 1 });
chatbotFAQSchema.index({ intent: 1 });
chatbotFAQSchema.index({ priority: -1 });
chatbotFAQSchema.index({ "keywords.urdu": 1 });
chatbotFAQSchema.index({ "keywords.english": 1 });

// Virtual for helpfulness ratio
chatbotFAQSchema.virtual("helpfulnessRatio").get(function () {
  const total = this.stats.helpfulCount + this.stats.notHelpfulCount;
  if (total === 0) return 0;
  return (this.stats.helpfulCount / total) * 100;
});

// Method to record usage
chatbotFAQSchema.methods.recordUsage = function () {
  this.stats.viewCount += 1;
  this.stats.lastUsedAt = new Date();
  return this.save();
};

// Method to record feedback
chatbotFAQSchema.methods.recordFeedback = function (isHelpful) {
  if (isHelpful) {
    this.stats.helpfulCount += 1;
  } else {
    this.stats.notHelpfulCount += 1;
  }
  return this.save();
};

// Static method to search FAQs
chatbotFAQSchema.statics.searchFAQs = async function (query, language = "urdu") {
  const searchRegex = new RegExp(query, "i");

  const faqs = await this.find({
    isActive: true,
    $or: [
      { [`question.${language}`]: { $regex: searchRegex } },
      { [`keywords.${language}`]: { $regex: searchRegex } },
      { [`answer.${language}`]: { $regex: searchRegex } },
    ],
  })
    .sort({ priority: -1, "stats.viewCount": -1 })
    .limit(5);

  return faqs;
};

const ChatbotFAQ = mongoose.model("ChatbotFAQ", chatbotFAQSchema);

export default ChatbotFAQ;
