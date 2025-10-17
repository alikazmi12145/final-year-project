import React from "react";
import { User, Users, Clock, CheckCircle, MessageSquare } from "lucide-react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

const ConversationsList = ({
  conversations,
  selectedConversation,
  onConversationSelect,
  searchTerm,
  loading,
}) => {
  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search in conversation name (for groups) or participant names
    if (conv.type === "group") {
      return conv.groupInfo?.name?.toLowerCase().includes(searchLower);
    } else {
      // For direct messages, search in participant names
      const otherParticipant = conv.participants?.find(
        (p) => p.user?._id !== selectedConversation?.currentUserId
      );
      return otherParticipant?.user?.name?.toLowerCase().includes(searchLower);
    }
  });

  const formatTime = (date) => {
    if (!date) return "";

    const messageDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - messageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "آج";
    } else if (diffDays === 2) {
      return "کل";
    } else if (diffDays < 7) {
      return `${diffDays} دن پہلے`;
    } else {
      return messageDate.toLocaleDateString("ur-PK");
    }
  };

  const getConversationTitle = (conversation) => {
    if (conversation.type === "group") {
      return conversation.groupInfo?.name || "گروپ چیٹ";
    } else {
      // For direct messages, show the other participant's name
      const otherParticipant = conversation.participants?.find(
        (p) => p.user?._id !== conversation.currentUserId
      );
      return otherParticipant?.user?.name || "نامعلوم صارف";
    }
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) {
      return "کوئی پیغام نہیں";
    }

    const content = conversation.lastMessage.content || "";
    return content.length > 50 ? content.substring(0, 50) + "..." : content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 nastaleeq-primary">
          {searchTerm ? "کوئی گفتگو نہیں ملی" : "ابھی کوئی گفتگو نہیں"}
        </p>
        {!searchTerm && (
          <p className="text-sm text-gray-500 mt-2 nastaleeq-primary">
            نئی گفتگو شروع کرنے کے لیے "+" دبائیں
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {filteredConversations.map((conversation) => (
        <div
          key={conversation._id}
          onClick={() => onConversationSelect(conversation)}
          className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-urdu-cream/20 ${
            selectedConversation?._id === conversation._id
              ? "bg-gradient-to-r from-urdu-maroon/10 to-urdu-gold/10 border-l-4 border-l-urdu-maroon"
              : ""
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {conversation.type === "group" ? (
                <div className="w-12 h-12 bg-gradient-to-br from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-urdu-brown truncate nastaleeq-primary">
                  {getConversationTitle(conversation)}
                </h3>

                {/* Time and Status */}
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatTime(
                      conversation.lastActivity || conversation.createdAt
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                {/* Last Message Preview */}
                <p
                  className="text-sm text-gray-600 truncate flex-1 nastaleeq-primary"
                  dir="rtl"
                >
                  {getLastMessagePreview(conversation)}
                </p>

                {/* Unread Badge */}
                {conversation.unreadCount > 0 && (
                  <div className="bg-urdu-maroon text-white text-xs rounded-full w-6 h-6 flex items-center justify-center ml-2">
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Group Members Count */}
              {conversation.type === "group" && (
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Users className="w-3 h-3 mr-1" />
                  <span>
                    {conversation.stats?.totalMembers ||
                      conversation.participants?.length ||
                      0}{" "}
                    اراکین
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationsList;
