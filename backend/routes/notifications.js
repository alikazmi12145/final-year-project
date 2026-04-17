import express from "express";
import { auth, adminAuth } from "../middleware/auth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  sendAnnouncement,
} from "../controllers/notificationController.js";

const router = express.Router();

// ==============================================
// Notification Routes - /api/notifications
// ==============================================

// ── Authenticated Users ──
// GET /api/notifications - Get user's notifications
router.get("/", auth, getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", auth, getUnreadCount);

// PUT /api/notifications/read-all - Mark all as read (MUST be before /:id)
router.put("/read-all", auth, markAllAsRead);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put("/:id/read", auth, markAsRead);

// DELETE /api/notifications/:id - Delete a notification
router.delete("/:id", auth, deleteNotification);

// ── Admin Only ──
// POST /api/notifications/announce - Send admin announcement
router.post("/announce", auth, adminAuth, sendAnnouncement);

export default router;
