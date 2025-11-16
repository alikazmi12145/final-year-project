import React, { useState, useRef, useEffect } from "react";
import {
  Reply,
  Forward,
  Copy,
  Star,
  Trash2,
  Info,
  Download,
  MoreVertical,
  Check,
} from "lucide-react";

const MessageActionsMenu = ({
  message,
  isOwnMessage,
  onReply,
  onForward,
  onCopy,
  onStar,
  onDelete,
  onInfo,
  position = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action, callback) => {
    if (callback) {
      callback(message);
    }
    setIsOpen(false);
  };

  const copyMessageText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      handleAction("copy", onCopy);
    }
  };

  const menuItems = [
    {
      icon: Reply,
      label: "جواب دیں",
      action: () => handleAction("reply", onReply),
      show: true,
    },
    {
      icon: Forward,
      label: "آگے بھیجیں",
      action: () => handleAction("forward", onForward),
      show: true,
    },
    {
      icon: Copy,
      label: "کاپی کریں",
      action: copyMessageText,
      show: message.content && message.messageType === "text",
    },
    {
      icon: message.isStarred ? Check : Star,
      label: message.isStarred ? "ستارہ ہٹائیں" : "ستارہ لگائیں",
      action: () => handleAction("star", onStar),
      show: true,
    },
    {
      icon: Download,
      label: "ڈاؤن لوڈ کریں",
      action: () => {
        if (message.attachments?.[0]?.url) {
          window.open(message.attachments[0].url, "_blank");
        }
      },
      show: message.messageType !== "text" && message.attachments?.length > 0,
    },
    {
      icon: Info,
      label: "معلومات",
      action: () => handleAction("info", onInfo),
      show: true,
    },
    {
      icon: Trash2,
      label: isOwnMessage ? "سب کے لیے حذف کریں" : "میرے لیے حذف کریں",
      action: () => handleAction("delete", onDelete),
      show: true,
      danger: true,
    },
  ];

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
          isOpen ? "bg-gray-100 dark:bg-gray-700" : ""
        }`}
        title="مزید اختیارات"
      >
        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 ${
            position === "left" ? "right-0" : "left-0"
          }`}
          style={{ minWidth: "200px" }}
        >
          {menuItems
            .filter((item) => item.show)
            .map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  item.danger
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
                dir="rtl"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-right nastaleeq-primary">
                  {item.label}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default MessageActionsMenu;
