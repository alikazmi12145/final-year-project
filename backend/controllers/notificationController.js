import Notification from "../models/Notification.js";
import User from "../models/User.js";

// ==============================================
// Notification Controller - Read, Mark, Admin Broadcast
// ==============================================

// ── GET USER NOTIFICATIONS (Paginated) ──
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.user.userId };

    // Filter by type if provided
    if (type && ["post", "comment", "admin"].includes(type)) {
      query.type = type;
    }

    // Filter unread only
    if (unreadOnly === "true") {
      query.read = false;
    }

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user.userId,
      read: false,
    });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "اطلاعات لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── MARK SINGLE NOTIFICATION AS READ ──
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "اطلاع نہیں ملی",
      });
    }

    res.json({
      success: true,
      message: "اطلاع پڑھی جا چکی",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "اطلاع اپ ڈیٹ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── MARK ALL NOTIFICATIONS AS READ ──
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: "تمام اطلاعات پڑھی جا چکیں",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "اطلاعات اپ ڈیٹ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── DELETE A NOTIFICATION ──
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "اطلاع نہیں ملی",
      });
    }

    res.json({
      success: true,
      message: "اطلاع حذف ہو گئی",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "اطلاع حذف کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── GET UNREAD COUNT ──
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.userId,
      read: false,
    });

    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "شمار لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── SEND ADMIN ANNOUNCEMENT (Admin Only) ──
export const sendAnnouncement = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "اعلان کا پیغام ضروری ہے",
      });
    }

    // Get all active users except the admin
    const users = await User.find(
      { status: "active", _id: { $ne: req.user.userId } },
      "_id"
    ).lean();

    if (users.length === 0) {
      return res.json({
        success: true,
        message: "کوئی فعال صارف نہیں ملا",
      });
    }

    // Bulk create notifications
    const notifications = users.map((u) => ({
      userId: u._id,
      message: message.trim(),
      type: "admin",
    }));
    await Notification.insertMany(notifications);

    // Real-time broadcast via Socket.io
    const io = req.app.get("io");
    if (io) {
      users.forEach((u) => {
        io.to(u._id.toString()).emit("notification", {
          message: message.trim(),
          type: "admin",
        });
      });
    }

    res.json({
      success: true,
      message: `اعلان ${users.length} صارفین کو بھیج دیا گیا`,
      data: { recipientCount: users.length },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "اعلان بھیجنے میں خرابی",
      error: error.message,
    });
  }
};
