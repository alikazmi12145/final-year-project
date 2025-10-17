import express from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import { Message } from "../models/Message.js";
import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";

const router = express.Router();

// Rate limiting for chat operations
const chatLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many chat requests, please try again later.",
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed"), false);
    }
  },
});

// 💬 DIRECT MESSAGING ROUTES

// Get user's conversations
router.get("/conversations", auth, chatLimit, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = "all" } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      "participants.user": req.user.userId,
      "participants.isActive": true,
      status: "active",
    };

    if (type !== "all") {
      filter.type = type;
    }

    const conversations = await Chat.find(filter)
      .populate("participants.user", "name profileImage.url")
      .populate("lastMessage")
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(
          (p) => p.user._id.toString() === req.user.userId
        );

        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          createdAt: { $gt: participant.lastReadAt || conv.createdAt },
          sender: { $ne: req.user.userId },
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithUnread,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Chat.countDocuments(filter),
      },
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
});

// Start new direct conversation
router.post(
  "/conversations/direct",
  auth,
  chatLimit,
  [body("recipientId").isMongoId().withMessage("Invalid recipient ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { recipientId } = req.body;

      // Check if conversation already exists
      const existingConversation = await Chat.findOne({
        type: "direct",
        "participants.user": { $all: [req.user.userId, recipientId] },
      });

      if (existingConversation) {
        return res.json({
          success: true,
          conversation: existingConversation,
          message: "Existing conversation found",
        });
      }

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: "Recipient not found",
        });
      }

      // Create new conversation
      const conversation = new Chat({
        chatType: "direct",
        participants: [
          { user: req.user.userId, role: "member" },
          { user: recipientId, role: "member" },
        ],
      });

      await conversation.save();
      await conversation.populate("participants.user", "name profileImage.url");

      res.status(201).json({
        success: true,
        conversation,
        message: "Direct conversation created successfully",
      });
    } catch (error) {
      console.error("Create direct conversation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create conversation",
      });
    }
  }
);

// Create group chat
router.post(
  "/conversations/group",
  auth,
  chatLimit,
  [
    body("name")
      .isLength({ min: 1, max: 100 })
      .withMessage("Group name is required"),
    body("description").optional().isLength({ max: 500 }),
    body("participantIds")
      .isArray({ min: 1 })
      .withMessage("At least one participant is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { name, description, participantIds, isPublic = false } = req.body;

      // Validate participants
      const participants = await User.find({ _id: { $in: participantIds } });
      if (participants.length !== participantIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some participants not found",
        });
      }

      // Create group conversation
      const conversation = new Chat({
        chatType: "group",
        chatName: name,
        description,
        groupSettings: {
          isPrivate: !isPublic,
        },
        participants: [
          { user: req.user.userId, role: "admin" }, // Creator is admin
          ...participantIds.map((id) => ({ user: id, role: "member" })),
        ],
      });

      await conversation.save();
      await conversation.populate("participants.user", "name profileImage.url");

      // Create system message about group creation
      const systemMessage = new Message({
        content: `${req.user.name} نے گروپ "${name}" بنایا`,
        messageType: "system",
        sender: req.user.userId,
        conversation: conversation._id,
        isSystemMessage: true,
        recipients: participantIds.map((id) => ({ user: id })),
      });

      await systemMessage.save();
      await conversation.updateLastMessage(
        systemMessage._id,
        `${req.user.name} created the group`
      );

      res.status(201).json({
        success: true,
        conversation,
        message: "Group conversation created successfully",
      });
    } catch (error) {
      console.error("Create group conversation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create group conversation",
      });
    }
  }
);

// Get messages for a conversation
router.get(
  "/conversations/:conversationId/messages",
  auth,
  chatLimit,
  async (req, res) => {
    console.log(
      `🔍 GET Messages Request - ConversationId: ${req.params.conversationId}, UserId: ${req.user?.userId}`
    );

    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      // Validate conversation ID format
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID format",
        });
      }

      // Check if user is participant
      const conversation = await Chat.findOne({
        _id: new mongoose.Types.ObjectId(conversationId),
        "participants.user": new mongoose.Types.ObjectId(req.user.userId),
        "participants.isActive": true,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found or access denied",
        });
      }

      const messages = await Message.find({
        conversation: new mongoose.Types.ObjectId(conversationId),
      })
        .populate("sender", "name profileImage.url")
        .populate("replyTo", "content sender")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Mark messages as read
      const participant = conversation.participants.find(
        (p) => p.user.toString() === req.user.userId
      );
      participant.lastReadAt = new Date();
      await conversation.save();

      res.json({
        success: true,
        messages: messages.reverse(), // Oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: await Message.countDocuments({
            conversation: new mongoose.Types.ObjectId(conversationId),
          }),
        },
      });
    } catch (error) {
      console.error("Get messages error:", error);
      console.error("ConversationId:", req.params.conversationId);
      console.error("UserId:", req.user?.userId);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Send message
router.post(
  "/conversations/:conversationId/messages",
  auth,
  chatLimit,
  upload.single("attachment"),
  [
    body("content").optional().isLength({ min: 1, max: 2000 }),
    body("messageType")
      .optional()
      .isIn(["text", "image", "audio", "file", "poem"]),
    body("replyToId").optional().isMongoId(),
  ],
  async (req, res) => {
    console.log(
      `📤 POST Message Request - ConversationId: ${
        req.params.conversationId
      }, UserId: ${req.user?.userId}, Content: ${req.body.content?.substring(
        0,
        50
      )}...`
    );

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { conversationId } = req.params;
      const { content, messageType = "text", replyToId } = req.body;

      // Validate conversation ID format
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID format",
        });
      }

      // Validate that either content or file is provided
      if (!content && !req.file) {
        return res.status(400).json({
          success: false,
          message: "Message content or attachment is required",
        });
      }

      // Check conversation access
      const conversation = await Chat.findOne({
        _id: new mongoose.Types.ObjectId(conversationId),
        "participants.user": new mongoose.Types.ObjectId(req.user.userId),
        "participants.isActive": true,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found or access denied",
        });
      }

      // Get all active participants for recipients
      const activeParticipants = conversation.participants
        .filter((p) => p.isActive && p.user.toString() !== req.user.userId)
        .map((p) => ({ user: p.user }));

      const messageData = {
        content: content || "",
        messageType,
        sender: new mongoose.Types.ObjectId(req.user.userId),
        conversation: new mongoose.Types.ObjectId(conversationId),
        recipients: activeParticipants,
      };

      // Handle reply
      if (replyToId) {
        if (mongoose.Types.ObjectId.isValid(replyToId)) {
          const replyMessage = await Message.findById(replyToId);
          if (
            replyMessage &&
            replyMessage.conversation.toString() === conversationId
          ) {
            messageData.replyTo = new mongoose.Types.ObjectId(replyToId);
          }
        }
      }

      // Handle file attachment
      if (req.file) {
        // In a real app, upload to Cloudinary or similar service
        messageData.attachments = [
          {
            type: req.file.mimetype.startsWith("image/") ? "image" : "document",
            filename: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            // url and publicId would be set after uploading to cloud storage
          },
        ];
      }

      const message = new Message(messageData);
      await message.save();

      await message.populate("sender", "name profileImage.url");
      if (replyToId) {
        await message.populate("replyTo", "content sender");
      }

      // Update conversation
      await conversation.updateLastMessage(
        message._id,
        message.content || message.messageType
      );

      // TODO: Emit real-time update via Socket.io
      // io.to(conversationId).emit('new_message', message);

      res.status(201).json({
        success: true,
        message,
        messageText: "Message sent successfully",
      });
    } catch (error) {
      console.error("Send message error:", error);
      console.error("ConversationId:", req.params.conversationId);
      console.error("UserId:", req.user?.userId);
      console.error("MessageData:", req.body);
      res.status(500).json({
        success: false,
        message: "Failed to send message",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Add reaction to message
router.post(
  "/messages/:messageId/reactions",
  auth,
  chatLimit,
  [body("emoji").isIn(["👍", "❤️", "😊", "👏", "🔥", "💯", "🌹", "✨"])],
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Check if user has access to this conversation
      const conversation = await Chat.findOne({
        _id: message.conversation,
        "participants.user": req.user.userId,
        "participants.isActive": true,
      });

      if (!conversation) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      await message.addReaction(req.user.userId, emoji);

      res.json({
        success: true,
        message: "Reaction added successfully",
      });
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add reaction",
      });
    }
  }
);

// 🤖 CHATBOT ASSISTANCE ROUTES

// Get bot response
router.post(
  "/bot/chat",
  chatLimit,
  [
    body("message")
      .isLength({ min: 1, max: 500 })
      .withMessage("Message is required"),
    body("language").optional().isIn(["urdu", "english"]),
  ],
  async (req, res) => {
    try {
      const { message, language = "urdu" } = req.body;

      // Simple rule-based chatbot responses
      const botResponses = getBotResponse(message.toLowerCase(), language);

      res.json({
        success: true,
        response: botResponses.response,
        suggestions: botResponses.suggestions || [],
        intent: botResponses.intent,
      });
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({
        success: false,
        message: "Chatbot service unavailable",
      });
    }
  }
);

// 🎫 SUPPORT TICKET ROUTES

// Create support ticket
router.post(
  "/support/tickets",
  auth,
  chatLimit,
  [
    body("subject")
      .isLength({ min: 5, max: 200 })
      .withMessage("Subject must be between 5-200 characters"),
    body("description")
      .isLength({ min: 10, max: 5000 })
      .withMessage("Description must be at least 10 characters"),
    body("category")
      .isIn([
        "technical",
        "account",
        "poetry",
        "payment",
        "content",
        "suggestion",
        "complaint",
        "general",
      ])
      .withMessage("Invalid category"),
    body("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    body("email").isEmail().withMessage("Valid email is required"),
    body("name")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2-100 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        subject,
        description,
        category,
        priority = "medium",
        email,
        name,
      } = req.body;

      const ticketData = {
        subject,
        description,
        category,
        priority,
        contactInfo: { name, email },
      };

      // If user is authenticated, add user reference
      if (req.user) {
        ticketData.user = req.user.userId;
      }

      // Create ticket (ticketId will be auto-generated by pre-validate middleware)
      const ticket = new SupportTicket(ticketData);

      await ticket.save();

      res.status(201).json({
        success: true,
        ticket: {
          ticketId: ticket.ticketId,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
        },
        message: "Support ticket created successfully",
      });
    } catch (error) {
      console.error("Create support ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create support ticket",
      });
    }
  }
);

// Get user's support tickets
router.get("/support/tickets", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "all" } = req.query;
    const skip = (page - 1) * limit;

    let filter = { user: req.user.userId };
    if (status !== "all") {
      filter.status = status;
    }

    const tickets = await SupportTicket.find(filter)
      .select(
        "ticketId subject category priority status createdAt lastActivityAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await SupportTicket.countDocuments(filter),
      },
    });
  } catch (error) {
    console.error("Get support tickets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch support tickets",
    });
  }
});

// Get ticket details
router.get("/support/tickets/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    let filter = { ticketId };

    // If user is authenticated, add user filter
    if (req.user) {
      filter.user = req.user.userId;
    }

    const ticket = await SupportTicket.findOne(filter)
      .populate("replies.author", "name profileImage.url")
      .populate("assignedTo", "name");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Increment view count
    ticket.stats.viewCount += 1;
    await ticket.save();

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("Get ticket details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket details",
    });
  }
});

// Simple chatbot response function
function getBotResponse(message, language = "urdu") {
  const urduResponses = {
    greetings: {
      keywords: ["سلام", "آداب", "نمسکار", "ہیلو", "hi", "hello", "سلاما لیکم"],
      response:
        "آداب! بزم سخن میں آپ کا خوش آمدید۔ میں آپ کی مدد کے لیے حاضر ہوں۔ کیا آپ کو کوئی مدد چاہیے؟",
      suggestions: [
        "شاعری کیسے تلاش کروں؟",
        "نیا اکاؤنٹ کیسے بنائیں؟",
        "مشاعرے کی معلومات",
      ],
    },
    poetry_search: {
      keywords: ["شاعری", "تلاش", "search", "poem", "غزل", "نظم"],
      response:
        "شاعری تلاش کرنے کے لیے:\n• اوپر search باکس استعمال کریں\n• آواز سے تلاش کر سکتے ہیں\n• تصویر سے بھی تلاش کر سکتے ہیں\n• شاعر کے نام سے تلاش کریں",
      suggestions: ["آواز سے تلاش کیسے کریں؟", "مشہور شعراء", "نئی شاعری"],
    },
    account: {
      keywords: ["اکاؤنٹ", "account", "رجسٹر", "register", "لاگ ان", "login"],
      response:
        "اکاؤنٹ کے لیے:\n• 'مفت رکنیت' پر کلک کریں\n• اپنی تفصیلات بھریں\n• قارئ یا شاعر کا انتخاب کریں\n• ای میل verify کریں",
      suggestions: [
        "پاس ورڈ بھول گئے؟",
        "شاعر اکاؤنٹ کیسے بنائیں؟",
        "پروفائل کیسے اپ ڈیٹ کریں؟",
      ],
    },
    upload: {
      keywords: ["اپ لوڈ", "upload", "شاعری اپ لوڈ", "poem upload"],
      response:
        "شاعری اپ لوڈ کرنے کے لیے:\n• پہلے شاعر اکاؤنٹ بنائیں\n• Dashboard میں جائیں\n• 'نئی شاعری' پر کلک کریں\n• اپنی شاعری لکھیں اور محفوظ کریں",
      suggestions: [
        "شاعر اکاؤنٹ کی منظوری کتنا وقت لگتا ہے؟",
        "کیا قوانین ہیں؟",
        "شاعری کی اقسام",
      ],
    },
    help: {
      keywords: ["مدد", "help", "کیسے", "how", "مسئلہ", "problem"],
      response:
        "میں آپ کی مدد کر سکتا ہوں:\n• شاعری تلاش کرنا\n• اکاؤنٹ بنانا\n• شاعری اپ لوڈ کرنا\n• مشاعروں کی معلومات\n• تکنیکی مسائل",
      suggestions: ["رابطہ کریں", "عام سوالات", "تکنیکی مدد"],
    },
    default: {
      response:
        "معاف کریں، میں آپ کے سوال کو صحیح طریقے سے نہیں سمجھ پایا۔ کیا آپ اسے دوسرے طریقے سے پوچھ سکتے ہیں؟",
      suggestions: ["شاعری کی تلاش", "اکاؤنٹ کی مدد", "رابطہ کریں"],
    },
  };

  // Find matching intent
  for (const [intent, data] of Object.entries(urduResponses)) {
    if (intent === "default") continue;

    const found = data.keywords.some((keyword) =>
      message.includes(keyword.toLowerCase())
    );

    if (found) {
      return {
        response: data.response,
        suggestions: data.suggestions,
        intent,
      };
    }
  }

  // Default response
  return {
    response: urduResponses.default.response,
    suggestions: urduResponses.default.suggestions,
    intent: "default",
  };
}

// ===========================================
// 🔍 USER SEARCH ENDPOINTS
// ===========================================

// Search users for new chats
router.get("/users/search", auth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    // Search users by name, username, or email
    const searchRegex = new RegExp(query.trim(), "i");

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.userId } }, // Exclude current user
        { status: "active" }, // Only active users
        {
          $or: [
            { name: { $regex: searchRegex } },
            { username: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
          ],
        },
      ],
    })
      .select("name username email role avatar createdAt")
      .limit(20)
      .sort({ name: 1 });

    res.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
});

export default router;
