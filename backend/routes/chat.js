import express from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import Chat from "../models/Chat.js";
import { Message } from "../models/Message.js";
import SupportTicket from "../models/SupportTicket.js";
import ChatbotFAQ from "../models/ChatbotFAQ.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import { Readable } from "stream";

const router = express.Router();

// Initialize GridFS bucket for file storage
let gridFSBucket;
mongoose.connection.once('open', () => {
  gridFSBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'chatFiles'
  });
  console.log('✅ GridFS initialized for chat files');
});

// Also initialize on already-open connections
if (mongoose.connection.readyState === 1) {
  gridFSBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'chatFiles'
  });
  console.log('✅ GridFS initialized for chat files (existing connection)');
}

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
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|webm|mp3|wav|ogg|m4a|mp4|avi|mov/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = /image\/|audio\/|video\/|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\//.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error("Only images, audio, video and documents are allowed"), false);
    }
  },
});

// Helper function to upload file to MongoDB GridFS
const uploadToGridFS = (fileBuffer, fileName, mimeType) => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      reject(new Error('GridFS not initialized'));
      return;
    }

    const readableStream = Readable.from(fileBuffer);
    const uploadStream = gridFSBucket.openUploadStream(fileName, {
      contentType: mimeType,
      metadata: {
        originalName: fileName,
        uploadDate: new Date()
      }
    });

    readableStream.pipe(uploadStream)
      .on('error', (error) => {
        console.error('❌ GridFS upload error:', error);
        reject(error);
      })
      .on('finish', () => {
        console.log('✅ File uploaded to GridFS:', uploadStream.id);
        resolve({
          fileId: uploadStream.id,
          fileName: fileName,
          contentType: mimeType
        });
      });
  });
};

// 💬 DIRECT MESSAGING ROUTES

// Get user's conversations
router.get("/conversations", auth, chatLimit, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = "all" } = req.query;
    const skip = (page - 1) * limit;

    console.log("📋 Getting conversations for user:", req.user.userId);

    let filter = {
      participants: {
        $elemMatch: {
          user: req.user.userId,
          isActive: true
        }
      }
    };

    if (type !== "all") {
      filter.chatType = type; // Use chatType instead of type
    }

    console.log("🔍 Conversation filter:", JSON.stringify(filter));

    const conversations = await Chat.find(filter)
      .populate("participants.user", "name profileImage")
      .populate({
        path: "lastMessage.message",
        select: "content messageType createdAt sender",
        populate: {
          path: "sender",
          select: "name"
        }
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log("✅ Found conversations:", conversations.length);

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        try {
          // Find the current user's participant record
          const participant = conv.participants.find(
            (p) => {
              // Handle both populated and non-populated user references
              const participantUserId = p.user?._id?.toString() || p.user?.toString();
              const currentUserId = req.user.userId.toString();
              return participantUserId === currentUserId;
            }
          );

          // If participant not found, skip this conversation (should not happen)
          if (!participant) {
            console.warn(`⚠️ User ${req.user.userId} not found in conversation ${conv._id}`);
            console.warn(`   Participants:`, conv.participants.map(p => ({
              userId: p.user?._id || p.user,
              isActive: p.isActive
            })));
            return {
              ...conv,
              unreadCount: 0,
            };
          }

          const unreadCount = await Message.countDocuments({
            conversation: conv._id,
            createdAt: { $gt: participant.lastReadAt || conv.createdAt },
            sender: { $ne: req.user.userId },
          });

          console.log(`   Conv ${conv._id}: ${unreadCount} unread messages`);

          return {
            ...conv,
            unreadCount,
          };
        } catch (convError) {
          console.error(`Error processing conversation ${conv._id}:`, convError);
          return {
            ...conv,
            unreadCount: 0,
          };
        }
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

      console.log("🔍 Checking for existing conversation:", {
        userId: req.user.userId,
        recipientId: recipientId
      });

      // Check if conversation already exists - improved query
      const existingConversation = await Chat.findOne({
        chatType: "direct",
        $and: [
          { "participants.user": req.user.userId },
          { "participants.user": recipientId }
        ],
        "participants": { $size: 2 } // Ensure it's only these 2 users
      }).populate("participants.user", "name profileImage");

      if (existingConversation) {
        console.log("✅ Found existing conversation:", existingConversation._id);
        
        // Reactivate if participant was inactive
        let needsSave = false;
        existingConversation.participants.forEach(p => {
          if (!p.isActive && 
              (p.user._id.toString() === req.user.userId || p.user._id.toString() === recipientId)) {
            p.isActive = true;
            p.leftAt = null;
            needsSave = true;
          }
        });
        
        if (needsSave) {
          await existingConversation.save();
        }
        
        return res.json({
          success: true,
          conversation: existingConversation,
          message: "Existing conversation found",
        });
      }

      console.log("➕ Creating new conversation");

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
      await conversation.populate("participants.user", "name profileImage");

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
      await conversation.populate("participants.user", "name profileImage");

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

      // Fetch messages with proper error handling
      let messages = [];
      try {
        messages = await Message.find({
          conversation: new mongoose.Types.ObjectId(conversationId),
        })
          .populate("sender", "name profileImage")
          .populate({
            path: "replyTo",
            select: "content sender",
            populate: {
              path: "sender",
              select: "name"
            }
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
      } catch (populateError) {
        console.error("Error populating messages:", populateError);
        // Try without populate if there's an error
        messages = await Message.find({
          conversation: new mongoose.Types.ObjectId(conversationId),
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
      }

      // Mark messages as read
      const participant = conversation.participants.find(
        (p) => p.user.toString() === req.user.userId
      );
      if (participant) {
        const oldLastReadAt = participant.lastReadAt;
        participant.lastReadAt = new Date();
        await conversation.save();

        // Emit read receipt to other participants
        const io = req.app.get("io");
        if (io) {
          const otherParticipants = conversation.participants.filter(
            (p) => p.user.toString() !== req.user.userId
          );

          otherParticipants.forEach((p) => {
            io.to(p.user.toString()).emit("messages_read", {
              conversationId,
              userId: req.user.userId,
              readAt: participant.lastReadAt,
            });
          });

          console.log(`✅ Marked messages as read for user ${req.user.userId} in conversation ${conversationId}`);
        }
      }

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
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
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

// Mark conversation messages as read
router.put(
  "/conversations/:conversationId/read",
  auth,
  chatLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      console.log(`📖 Marking conversation ${conversationId} as read for user ${req.user.userId}`);

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

      // Update participant's lastReadAt
      const participant = conversation.participants.find(
        (p) => p.user.toString() === req.user.userId.toString()
      );
      
      if (participant) {
        participant.lastReadAt = new Date();
        await conversation.save();

        // Emit read receipt to other participants
        const io = req.app.get("io");
        if (io) {
          const otherParticipants = conversation.participants.filter(
            (p) => p.user.toString() !== req.user.userId.toString()
          );

          otherParticipants.forEach((p) => {
            io.to(p.user.toString()).emit("messages_read", {
              conversationId,
              userId: req.user.userId,
              readAt: participant.lastReadAt,
            });
          });

          console.log(`✅ Marked messages as read and notified ${otherParticipants.length} participants`);
        }

        res.json({
          success: true,
          message: "Conversation marked as read",
          readAt: participant.lastReadAt,
        });
      } else {
        console.log(`❌ Participant not found. User ID: ${req.user.userId}, Participants:`, 
          conversation.participants.map(p => ({ user: p.user.toString(), isActive: p.isActive }))
        );
        res.status(404).json({
          success: false,
          message: "User not found in conversation participants",
        });
      }
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark conversation as read",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
        try {
          console.log("📁 Uploading file to GridFS:", req.file.originalname);
          
          // Ensure GridFS is initialized
          if (!gridFSBucket) {
            console.log("⏳ Waiting for GridFS initialization...");
            // Try to initialize if connection is ready
            if (mongoose.connection.readyState === 1) {
              gridFSBucket = new GridFSBucket(mongoose.connection.db, {
                bucketName: 'chatFiles'
              });
              console.log('✅ GridFS initialized');
            } else {
              throw new Error('Database connection not ready');
            }
          }
          
          // Determine attachment type
          let attachmentType = 'document';
          
          if (req.file.mimetype.startsWith("image/")) {
            attachmentType = 'image';
          } else if (req.file.mimetype.startsWith("audio/")) {
            attachmentType = 'audio';
          } else if (req.file.mimetype.startsWith("video/")) {
            attachmentType = 'video';
          }

          // Upload to GridFS
          const uploadResult = await uploadToGridFS(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
          );

          console.log("✅ File uploaded to GridFS with ID:", uploadResult.fileId);

          // Create URL to retrieve file
          const fileUrl = `/api/chat/files/${uploadResult.fileId}`;

          messageData.attachments = [
            {
              type: attachmentType,
              filename: req.file.originalname,
              size: req.file.size,
              mimeType: req.file.mimetype,
              url: fileUrl,
              publicId: uploadResult.fileId.toString(),
            },
          ];
        } catch (uploadError) {
          console.error("❌ GridFS upload error:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Failed to upload file",
            error: process.env.NODE_ENV === "development" ? uploadError.message : undefined,
          });
        }
      }

      const message = new Message(messageData);
      await message.save();

      await message.populate("sender", "name profileImage");
      if (replyToId) {
        await message.populate({
          path: "replyTo",
          select: "content sender",
          populate: {
            path: "sender",
            select: "name"
          }
        });
      }

      // Update conversation
      await conversation.updateLastMessage(
        message._id,
        message.content || message.messageType
      );

      // Emit real-time update via Socket.io
      const io = req.app.get("io");
      if (io) {
        const messageData = {
          ...message.toObject(),
          sender: {
            _id: message.sender._id,
            name: message.sender.name,
            profileImage: message.sender.profileImage,
          },
        };

        console.log("🔍 SOCKET EMISSION DEBUG:");
        console.log("   Conversation ID:", conversationId);
        console.log("   Sender:", req.user.userId);
        console.log("   All participants:", conversation.participants.map(p => ({ id: p.user.toString(), active: p.isActive })));

        // Emit to conversation room (for users actively viewing this chat)
        io.to(conversationId).emit("new_message", messageData);
        console.log("   ✅ Emitted to conversation room:", conversationId);

        // Also emit to each participant individually (for users not in the room)
        // This ensures everyone gets the message even if they're on different pages
        const participants = conversation.participants.filter(
          (p) => p.isActive && p.user.toString() !== req.user.userId
        );

        console.log("   Filtered participants (not sender):", participants.map(p => p.user.toString()));

        participants.forEach((participant) => {
          const participantId = participant.user.toString();
          io.to(participantId).emit("new_message", messageData);
          console.log("   ✅ Emitted to participant room:", participantId);
        });

        console.log(`📨 Message emitted to room ${conversationId} and ${participants.length} participants`);
      }

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

// Get bot response with FAQ search
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

      // First try to find matching FAQ
      const faqs = await ChatbotFAQ.searchFAQs(message.toLowerCase(), language);

      if (faqs && faqs.length > 0) {
        const topFAQ = faqs[0];
        await topFAQ.recordUsage();

        return res.json({
          success: true,
          response: topFAQ.answer[language] || topFAQ.answer.urdu,
          suggestions:
            topFAQ.suggestions?.map((s) => ({
              text: s.text[language] || s.text.urdu,
              action: s.action,
              target: s.target,
            })) || [],
          intent: topFAQ.intent,
          faqId: topFAQ._id,
          source: "faq",
        });
      }

      // Fallback to rule-based responses
      const botResponses = getBotResponse(message.toLowerCase(), language);

      res.json({
        success: true,
        response: botResponses.response,
        suggestions: botResponses.suggestions || [],
        intent: botResponses.intent,
        source: "rule_based",
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

// Get all FAQ categories
router.get("/bot/categories", async (req, res) => {
  try {
    const categories = await ChatbotFAQ.distinct("category", {
      isActive: true,
    });

    const categoryLabels = {
      navigation: { urdu: "رہنمائی", english: "Navigation" },
      account: { urdu: "اکاؤنٹ", english: "Account" },
      poetry: { urdu: "شاعری", english: "Poetry" },
      search: { urdu: "تلاش", english: "Search" },
      upload: { urdu: "اپ لوڈ", english: "Upload" },
      contests: { urdu: "مقابلے", english: "Contests" },
      technical: { urdu: "تکنیکی", english: "Technical" },
      general: { urdu: "عام", english: "General" },
    };

    res.json({
      success: true,
      categories: categories.map((cat) => ({
        value: cat,
        label: categoryLabels[cat] || { urdu: cat, english: cat },
      })),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});

// Get FAQs by category
router.get("/bot/faqs/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { language = "urdu" } = req.query;

    const faqs = await ChatbotFAQ.find({
      category,
      isActive: true,
    })
      .select("question answer intent suggestions")
      .sort({ priority: -1, "stats.viewCount": -1 })
      .limit(10);

    res.json({
      success: true,
      faqs: faqs.map((faq) => ({
        _id: faq._id,
        question: faq.question[language] || faq.question.urdu,
        answer: faq.answer[language] || faq.answer.urdu,
        intent: faq.intent,
        suggestions:
          faq.suggestions?.map((s) => ({
            text: s.text[language] || s.text.urdu,
            action: s.action,
            target: s.target,
          })) || [],
      })),
    });
  } catch (error) {
    console.error("Get FAQs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
    });
  }
});

// Record FAQ feedback
router.post(
  "/bot/faqs/:faqId/feedback",
  [body("isHelpful").isBoolean()],
  async (req, res) => {
    try {
      const { faqId } = req.params;
      const { isHelpful } = req.body;

      const faq = await ChatbotFAQ.findById(faqId);
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: "FAQ not found",
        });
      }

      await faq.recordFeedback(isHelpful);

      res.json({
        success: true,
        message: "Feedback recorded",
      });
    } catch (error) {
      console.error("Record feedback error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record feedback",
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
        "general",
        "technical",
        "account",
        "poetry",
        "contest",
        "feature",
        "bug",
        "other",
        "payment",
        "content",
        "suggestion",
        "complaint",
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
          _id: ticket._id,
          ticketId: ticket.ticketId,
          ticketNumber: ticket.ticketId, // For frontend compatibility
          subject: ticket.subject,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt,
          lastActivityAt: ticket.lastActivityAt,
          user: ticket.user,
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
        "ticketId subject description category priority status createdAt lastActivityAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add ticketNumber field for frontend compatibility
    const formattedTickets = tickets.map(ticket => ({
      ...ticket.toObject(),
      ticketNumber: ticket.ticketId
    }));

    res.json({
      success: true,
      tickets: formattedTickets,
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
      .populate("replies.author", "name profileImage")
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

// Add reply to support ticket
router.post(
  "/support/tickets/:ticketId/replies",
  auth,
  [
    body("content")
      .isLength({ min: 5, max: 5000 })
      .withMessage("Reply content must be between 5-5000 characters"),
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

      const { ticketId } = req.params;
      const { content } = req.body;

      const ticket = await SupportTicket.findOne({ ticketId });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      // Check if user is the ticket owner or admin
      const isOwner =
        ticket.user && ticket.user.toString() === req.user.userId;
      const isAdmin = req.user.role === "admin" || req.user.role === "support";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      await ticket.addReply(req.user.userId, content, false);

      // If user is owner and ticket was waiting, change status to in_progress
      if (isOwner && ticket.status === "waiting_customer") {
        await ticket.changeStatus("in_progress", req.user.userId, "Customer replied");
      }

      // Populate the new reply
      await ticket.populate("replies.author", "name profileImage");

      res.json({
        success: true,
        message: "Reply added successfully",
        reply: ticket.replies[ticket.replies.length - 1],
      });
    } catch (error) {
      console.error("Add reply error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add reply",
      });
    }
  }
);

// Update ticket status (for admins)
router.patch(
  "/support/tickets/:ticketId/status",
  auth,
  [body("status").isIn(["open", "in_progress", "waiting_customer", "resolved", "closed", "escalated"])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Check if user is admin
      if (req.user.role !== "admin" && req.user.role !== "support") {
        return res.status(403).json({
          success: false,
          message: "Only admins can update ticket status",
        });
      }

      const { ticketId } = req.params;
      const { status, reason } = req.body;

      const ticket = await SupportTicket.findOne({ ticketId });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      await ticket.changeStatus(status, req.user.userId, reason);

      res.json({
        success: true,
        message: "Ticket status updated",
        ticket: {
          ticketId: ticket.ticketId,
          status: ticket.status,
        },
      });
    } catch (error) {
      console.error("Update ticket status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update ticket status",
      });
    }
  }
);

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

// ===========================================
// 📁 FILE SERVING ENDPOINT (GridFS)
// ===========================================

// Serve files from GridFS
router.get("/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!gridFSBucket) {
      return res.status(500).json({
        success: false,
        message: "File storage not initialized",
      });
    }

    // Validate fileId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID",
      });
    }

    // Find file metadata
    const files = await gridFSBucket
      .find({ _id: new mongoose.Types.ObjectId(fileId) })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const file = files[0];

    // Set appropriate headers
    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${file.metadata?.originalName || file.filename}"`,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });

    // Stream the file
    const downloadStream = gridFSBucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId)
    );

    downloadStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error streaming file",
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Serve file error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to serve file",
      });
    }
  }
});

export default router;
