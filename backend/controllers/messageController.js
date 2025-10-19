import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * Message Controller for Bazm-E-Sukhan Platform
 * Handles messaging system, chat functionality, and direct communications
 */

class MessageController {
  // ============= MESSAGING SYSTEM =============

  /**
   * Send a new message
   */
  static async sendMessage(req, res) {
    try {
      const { recipientId, content, messageType = "text" } = req.body;
      const senderId = req.user.id;

      // Validation
      if (!recipientId || !content) {
        return res.status(400).json({
          success: false,
          message: "پیغام کا مواد اور وصول کنندہ ضروری ہے",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({
          success: false,
          message: "غلط وصول کنندہ ID",
        });
      }

      if (senderId === recipientId) {
        return res.status(400).json({
          success: false,
          message: "آپ خود کو پیغام نہیں بھیج سکتے",
        });
      }

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: "وصول کنندہ موجود نہیں",
        });
      }

      // Check if sender is blocked by recipient
      if (recipient.blockedUsers && recipient.blockedUsers.includes(senderId)) {
        return res.status(403).json({
          success: false,
          message: "آپ اس صارف کو پیغام نہیں بھیج سکتے",
        });
      }

      const message = new Message({
        sender: senderId,
        recipient: recipientId,
        content: content.trim(),
        messageType,
      });

      // Handle media attachments if present
      if (req.files && req.files.attachment) {
        message.attachment = {
          url: req.files.attachment[0].path,
          publicId: req.files.attachment[0].filename,
          filename: req.files.attachment[0].originalname,
          fileType: req.files.attachment[0].mimetype,
        };
        message.messageType = "media";
      }

      await message.save();

      // Populate sender and recipient info
      await message.populate([
        { path: "sender", select: "username profile.fullName profile.avatar" },
        {
          path: "recipient",
          select: "username profile.fullName profile.avatar",
        },
      ]);

      res.status(201).json({
        success: true,
        message: "پیغام کامیابی سے بھیج دیا گیا",
        data: message,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        message: "پیغام بھیجتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get conversation between two users
   */
  static async getConversation(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      const { page = 1, limit = 50 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Get messages between current user and specified user
      const messages = await Message.find({
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
      })
        .populate("sender", "username profile.fullName profile.avatar")
        .populate("recipient", "username profile.fullName profile.avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalMessages = await Message.countDocuments({
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
      });

      // Mark messages as read
      await Message.updateMany(
        {
          sender: userId,
          recipient: currentUserId,
          isRead: false,
        },
        { isRead: true, readAt: new Date() }
      );

      // Reverse to show oldest first
      messages.reverse();

      res.json({
        success: true,
        messages,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalMessages / limitNum),
          totalMessages,
          hasNext: pageNum < Math.ceil(totalMessages / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({
        success: false,
        message: "گفتگو حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get all conversations for current user
   */
  static async getConversations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Get latest message for each conversation
      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: new mongoose.Types.ObjectId(userId) },
              { recipient: new mongoose.Types.ObjectId(userId) },
            ],
          },
        },
        {
          $addFields: {
            otherUser: {
              $cond: {
                if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
                then: "$recipient",
                else: "$sender",
              },
            },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: "$otherUser",
            lastMessage: { $first: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $eq: [
                          "$recipient",
                          new mongoose.Types.ObjectId(userId),
                        ],
                      },
                      { $eq: ["$isRead", false] },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "otherUser",
            pipeline: [
              {
                $project: {
                  username: 1,
                  profile: 1,
                  isOnline: 1,
                  lastSeen: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: "$otherUser",
        },
        {
          $sort: { "lastMessage.createdAt": -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limitNum,
        },
      ]);

      const totalConversations = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: new mongoose.Types.ObjectId(userId) },
              { recipient: new mongoose.Types.ObjectId(userId) },
            ],
          },
        },
        {
          $addFields: {
            otherUser: {
              $cond: {
                if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
                then: "$recipient",
                else: "$sender",
              },
            },
          },
        },
        {
          $group: {
            _id: "$otherUser",
          },
        },
        {
          $count: "total",
        },
      ]);

      const total = totalConversations[0]?.total || 0;

      res.json({
        success: true,
        conversations,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalConversations: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({
        success: false,
        message: "گفتگو کی فہرست حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({
          success: false,
          message: "غلط پیغام ID",
        });
      }

      const message = await Message.findById(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "پیغام موجود نہیں",
        });
      }

      // Only recipient can mark message as read
      if (message.recipient.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس پیغام کو پڑھے ہوئے کا نشان لگانے کی اجازت نہیں",
        });
      }

      message.isRead = true;
      message.readAt = new Date();
      await message.save();

      res.json({
        success: true,
        message: "پیغام کو پڑھے ہوئے کا نشان لگا دیا گیا",
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({
        success: false,
        message: "پیغام کو پڑھے ہوئے کا نشان لگاتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  static async markConversationAsRead(req, res) {
    try {
      const { userId: senderId } = req.params;
      const recipientId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      await Message.updateMany(
        {
          sender: senderId,
          recipient: recipientId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        }
      );

      res.json({
        success: true,
        message: "تمام پیغامات کو پڑھے ہوئے کا نشان لگا دیا گیا",
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({
        success: false,
        message: "گفتگو کو پڑھے ہوئے کا نشان لگاتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({
          success: false,
          message: "غلط پیغام ID",
        });
      }

      const message = await Message.findById(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "پیغام موجود نہیں",
        });
      }

      // Only sender can delete message or admin
      if (message.sender.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "آپ کو اس پیغام کو ڈیلیٹ کرنے کی اجازت نہیں",
        });
      }

      await Message.findByIdAndDelete(messageId);

      res.json({
        success: true,
        message: "پیغام کامیابی سے ڈیلیٹ ہوا",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({
        success: false,
        message: "پیغام ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete entire conversation
   */
  static async deleteConversation(req, res) {
    try {
      const { userId: otherUserId } = req.params;
      const currentUserId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      // Delete all messages between these users
      await Message.deleteMany({
        $or: [
          { sender: currentUserId, recipient: otherUserId },
          { sender: otherUserId, recipient: currentUserId },
        ],
      });

      res.json({
        success: true,
        message: "گفتگو کامیابی سے ڈیلیٹ ہوئی",
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({
        success: false,
        message: "گفتگو ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= BLOCKING & PRIVACY =============

  /**
   * Block a user
   */
  static async blockUser(req, res) {
    try {
      const { userId: userToBlockId } = req.params;
      const currentUserId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(userToBlockId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      if (currentUserId === userToBlockId) {
        return res.status(400).json({
          success: false,
          message: "آپ خود کو بلاک نہیں کر سکتے",
        });
      }

      const currentUser = await User.findById(currentUserId);
      const userToBlock = await User.findById(userToBlockId);

      if (!userToBlock) {
        return res.status(404).json({
          success: false,
          message: "صارف موجود نہیں",
        });
      }

      // Add to blocked users if not already blocked
      if (!currentUser.blockedUsers.includes(userToBlockId)) {
        currentUser.blockedUsers.push(userToBlockId);
        await currentUser.save();
      }

      res.json({
        success: true,
        message: "صارف کو بلاک کر دیا گیا",
      });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({
        success: false,
        message: "صارف کو بلاک کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(req, res) {
    try {
      const { userId: userToUnblockId } = req.params;
      const currentUserId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(userToUnblockId)) {
        return res.status(400).json({
          success: false,
          message: "غلط صارف ID",
        });
      }

      const currentUser = await User.findById(currentUserId);

      // Remove from blocked users
      currentUser.blockedUsers.pull(userToUnblockId);
      await currentUser.save();

      res.json({
        success: true,
        message: "صارف کو ان بلاک کر دیا گیا",
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({
        success: false,
        message: "صارف کو ان بلاک کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get blocked users list
   */
  static async getBlockedUsers(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const user = await User.findById(userId).populate({
        path: "blockedUsers",
        select: "username profile.fullName profile.avatar",
        options: {
          skip,
          limit: limitNum,
        },
      });

      const totalBlocked = user.blockedUsers.length;

      res.json({
        success: true,
        blockedUsers: user.blockedUsers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalBlocked / limitNum),
          totalBlocked,
          hasNext: pageNum < Math.ceil(totalBlocked / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      res.status(500).json({
        success: false,
        message: "بلاک شدہ صارفین حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= STATISTICS & ANALYTICS =============

  /**
   * Get message statistics
   */
  static async getMessageStatistics(req, res) {
    try {
      const userId = req.user.id;

      const [
        totalSent,
        totalReceived,
        unreadCount,
        conversationsCount,
        todayMessages,
      ] = await Promise.all([
        Message.countDocuments({ sender: userId }),
        Message.countDocuments({ recipient: userId }),
        Message.countDocuments({ recipient: userId, isRead: false }),
        Message.aggregate([
          {
            $match: {
              $or: [
                { sender: new mongoose.Types.ObjectId(userId) },
                { recipient: new mongoose.Types.ObjectId(userId) },
              ],
            },
          },
          {
            $addFields: {
              otherUser: {
                $cond: {
                  if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
                  then: "$recipient",
                  else: "$sender",
                },
              },
            },
          },
          {
            $group: {
              _id: "$otherUser",
            },
          },
          {
            $count: "total",
          },
        ]),
        Message.countDocuments({
          $or: [{ sender: userId }, { recipient: userId }],
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
      ]);

      const statistics = {
        totalSent,
        totalReceived,
        unreadCount,
        conversationsCount: conversationsCount[0]?.total || 0,
        todayMessages,
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching message statistics:", error);
      res.status(500).json({
        success: false,
        message: "پیغامات کے اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= SEARCH MESSAGES =============

  /**
   * Search messages
   */
  static async searchMessages(req, res) {
    try {
      const {
        q: searchQuery,
        userId: searchInUserId,
        page = 1,
        limit = 20,
      } = req.query;
      const currentUserId = req.user.id;

      if (!searchQuery || searchQuery.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "تلاش کی عبارت درج کریں",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      let query = {
        content: { $regex: searchQuery, $options: "i" },
        $or: [{ sender: currentUserId }, { recipient: currentUserId }],
      };

      // Search in specific conversation if userId provided
      if (searchInUserId && mongoose.Types.ObjectId.isValid(searchInUserId)) {
        query.$or = [
          { sender: currentUserId, recipient: searchInUserId },
          { sender: searchInUserId, recipient: currentUserId },
        ];
      }

      const messages = await Message.find(query)
        .populate("sender", "username profile.fullName profile.avatar")
        .populate("recipient", "username profile.fullName profile.avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalMessages = await Message.countDocuments(query);

      res.json({
        success: true,
        messages,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalMessages / limitNum),
          totalMessages,
          hasNext: pageNum < Math.ceil(totalMessages / limitNum),
          hasPrev: pageNum > 1,
        },
        searchQuery,
      });
    } catch (error) {
      console.error("Error searching messages:", error);
      res.status(500).json({
        success: false,
        message: "پیغامات تلاش کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default MessageController;
