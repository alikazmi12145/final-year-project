import React from "react";
import { X, Check, CheckCheck, User, Clock } from "lucide-react";

const MessageInfoModal = ({ isOpen, onClose, message, conversation }) => {
  if (!isOpen || !message) return null;

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("ur-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFullDateTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.toLocaleDateString("ur-PK")} ${formatTime(date)}`;
  };

  // Get read receipts from conversation participants
  const getReadReceipts = () => {
    if (!conversation?.participants) return [];
    
    return conversation.participants
      .filter((p) => p.user?._id !== message.sender?._id)
      .map((p) => ({
        user: p.user,
        readAt: p.lastReadAt,
        hasRead: p.lastReadAt && new Date(p.lastReadAt) >= new Date(message.createdAt),
      }));
  };

  const receipts = getReadReceipts();
  const readBy = receipts.filter((r) => r.hasRead);
  const deliveredTo = receipts.filter((r) => !r.hasRead);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-urdu-brown dark:text-white nastaleeq-heading">
            پیغام کی معلومات
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Content */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-urdu-cream/20">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
            <p className="text-sm text-gray-800 dark:text-gray-200 nastaleeq-primary" dir="rtl">
              {message.content || message.messageType}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 nastaleeq-primary">
                {formatFullDateTime(message.createdAt)}
              </span>
              <div className="flex items-center space-x-1">
                {message.isRead ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : (
                  <Check className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Read Receipts */}
        <div className="flex-1 overflow-y-auto">
          {/* Read By Section */}
          {readBy.length > 0 && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCheck className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 nastaleeq-primary">
                  دیکھا گیا
                </h3>
              </div>
              <div className="space-y-2">
                {readBy.map((receipt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 nastaleeq-primary">
                        {receipt.user?.name || "نامعلوم"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(receipt.readAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivered To Section */}
          {deliveredTo.length > 0 && (
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Check className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 nastaleeq-primary">
                  پہنچا دیا گیا
                </h3>
              </div>
              <div className="space-y-2">
                {deliveredTo.map((receipt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 nastaleeq-primary">
                        {receipt.user?.name || "نامعلوم"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Recipients */}
          {readBy.length === 0 && deliveredTo.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500 nastaleeq-primary">
                ابھی کسی نے نہیں دیکھا
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;
