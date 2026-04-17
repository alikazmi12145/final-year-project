import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import socketService from "../../services/socketService";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Newspaper,
  MessageCircle,
  Megaphone,
  X,
} from "lucide-react";

// ==============================================
// NotificationsPanel - Dropdown notification panel
// Shows real-time notifications with mark-as-read support
// ==============================================
const NotificationsPanel = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.notifications.getAll({ limit: 20 });
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Silently fail - notification fetch is non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Fetch unread count periodically ──
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.notifications.getUnreadCount();
      if (res.data.success) {
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch {
      // Silently fail
    }
  }, [user]);

  // ── Initial load ──
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // ── Real-time listener ──
  useEffect(() => {
    if (!user || !socketService.socket) return;

    const handleNotification = (data) => {
      // Add to top of list and bump unread count
      setNotifications((prev) => [
        {
          _id: Date.now().toString(), // temp id
          message: data.message,
          type: data.type,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUnreadCount((prev) => prev + 1);
    };

    socketService.socket.on("notification", handleNotification);
    return () => {
      socketService.socket?.off("notification", handleNotification);
    };
  }, [user]);

  // ── Poll for unread count every 60 seconds ──
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // ── Close panel on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Mark single notification as read ──
  const markAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  // ── Mark all as read ──
  const markAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  // ── Delete notification ──
  const deleteNotification = async (id) => {
    try {
      await api.notifications.delete(id);
      const removed = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (removed && !removed.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Silently fail
    }
  };

  // ── Type icon mapping ──
  const getTypeIcon = (type) => {
    switch (type) {
      case "post":
        return <Newspaper className="w-4 h-4 text-blue-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "admin":
        return <Megaphone className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // ── Format relative time ──
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ابھی";
    if (mins < 60) return `${mins} منٹ پہلے`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} گھنٹے پہلے`;
    const days = Math.floor(hours / 24);
    return `${days} دن پہلے`;
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell Icon Button ── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-amber-100 transition text-amber-800"
        title="اطلاعات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white rounded-xl shadow-2xl border border-amber-100 z-[100] flex flex-col overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b bg-amber-50 flex items-center justify-between">
            <h3 className="font-bold text-amber-900 text-sm">اطلاعات</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  سب پڑھیں
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 hover:bg-amber-200 rounded"
              >
                <X className="w-4 h-4 text-amber-700" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <BellOff className="w-10 h-10 mb-2" />
                <p className="text-sm">کوئی اطلاع نہیں</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`px-4 py-3 border-b last:border-b-0 flex items-start gap-3 hover:bg-gray-50 transition cursor-pointer ${
                    !notif.read ? "bg-amber-50/50" : ""
                  }`}
                  onClick={() => !notif.read && markAsRead(notif._id)}
                >
                  {/* Type Icon */}
                  <div className="mt-0.5">{getTypeIcon(notif.type)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${!notif.read ? "font-medium text-gray-900" : "text-gray-600"}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-amber-500" title="نیا" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif._id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
