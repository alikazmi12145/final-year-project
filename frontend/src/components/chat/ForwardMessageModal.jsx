import React, { useState, useEffect } from "react";
import { X, Search, User, Users, Send, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import api from "../../services/api";

const ForwardMessageModal = ({ isOpen, onClose, message, currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConvs, setSelectedConvs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.chat.getConversations();
      if (response.data.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleConversation = (convId) => {
    setSelectedConvs((prev) =>
      prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId]
    );
  };

  const handleForward = async () => {
    if (selectedConvs.length === 0) return;

    try {
      setForwarding(true);

      // Forward message to each selected conversation
      await Promise.all(
        selectedConvs.map((convId) =>
          api.chat.sendMessage(convId, {
            content: message.content,
            messageType: message.messageType,
            forwardedFrom: message._id,
          })
        )
      );

      onClose();
      setSelectedConvs([]);
    } catch (error) {
      console.error("Failed to forward message:", error);
    } finally {
      setForwarding(false);
    }
  };

  const getConversationTitle = (conversation) => {
    if (conversation.chatType === "group") {
      return conversation.chatName || "گروپ چیٹ";
    } else {
      const otherParticipant = conversation.participants?.find(
        (p) => p.user?._id !== currentUser?.id
      );
      return otherParticipant?.user?.name || "نامعلوم صارف";
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const title = getConversationTitle(conv).toLowerCase();
    return title.includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-urdu-brown dark:text-white nastaleeq-heading">
            پیغام آگے بھیجیں
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="تلاش کریں..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary bg-white dark:bg-gray-700 dark:text-white"
              dir="rtl"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 nastaleeq-primary">
                کوئی گفتگو نہیں ملی
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => toggleConversation(conv._id)}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConvs.includes(conv._id)
                    ? "bg-urdu-maroon/10 border-2 border-urdu-maroon"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedConvs.includes(conv._id)
                      ? "bg-urdu-maroon border-urdu-maroon"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedConvs.includes(conv._id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {conv.chatType === "group" ? (
                    <div className="w-10 h-10 bg-gradient-to-br from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-urdu-brown dark:text-white truncate nastaleeq-primary">
                    {getConversationTitle(conv)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400 nastaleeq-primary">
            {selectedConvs.length} منتخب
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={forwarding}
              className="nastaleeq-primary"
            >
              منسوخ کریں
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedConvs.length === 0 || forwarding}
              className="bg-urdu-maroon hover:bg-urdu-brown text-white nastaleeq-primary"
            >
              {forwarding ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  بھیجیں
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
