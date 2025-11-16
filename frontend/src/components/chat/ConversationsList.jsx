import React from "react";
import { User, Users, Clock, CheckCircle, MessageSquare } from "lucide-react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  // Use base URL without /api for static files
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const cleanBaseUrl = baseUrl.replace('/api', '');
  return `${cleanBaseUrl}${imagePath}`;
};

const ConversationsList = ({
  conversations,
  selectedConversation,
  onConversationSelect,
  searchTerm,
  loading,
  currentUser,
}) => {
  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search in conversation name (for groups) or participant names
    if (conv.chatType === "group") {
      return conv.chatName?.toLowerCase().includes(searchLower);
    } else {
      // For direct messages, search in participant names
      const otherParticipant = conv.participants?.find(
        (p) => p.user?._id !== currentUser?.id
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
    if (conversation.chatType === "group") {
      return conversation.chatName || "گروپ چیٹ";
    } else {
      // For direct messages, show the other participant's name
      const otherParticipant = conversation.participants?.find(
        (p) => p.user?._id !== currentUser?.id
      );
      
      console.log("🔍 Getting conversation title:", {
        conversationId: conversation._id,
        currentUserId: currentUser?.id,
        participants: conversation.participants?.map(p => ({ 
          id: p.user?._id, 
          name: p.user?.name 
        })),
        otherParticipant: otherParticipant?.user?.name
      });
      
      return otherParticipant?.user?.name || "نامعلوم صارف";
    }
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) {
      return "کوئی پیغام نہیں";
    }

    // Handle both formats: lastMessage.preview or lastMessage.message.content
    const content = conversation.lastMessage.preview || 
                    conversation.lastMessage.message?.content || 
                    conversation.lastMessage.content || 
                    "";
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
    <div className="overflow-y-auto h-full bg-gradient-to-b from-urdu-cream/10 to-white">
      {filteredConversations.map((conversation) => {
        const title = getConversationTitle(conversation);
        const isSelected = selectedConversation?._id === conversation._id;
        
        return (
          <div
            key={conversation._id}
            onClick={() => onConversationSelect(conversation)}
            className={`p-4 border-b border-urdu-gold/10 cursor-pointer transition-all duration-300 hover:shadow-md ${
              isSelected
                ? "bg-gradient-to-r from-urdu-maroon/15 via-urdu-gold/10 to-urdu-cream/20 border-r-4 border-r-urdu-maroon shadow-lg"
                : "hover:bg-gradient-to-r hover:from-urdu-cream/20 hover:to-white"
            }`}
          >
            <div className="flex items-start space-x-3 space-x-reverse">
              {/* Avatar with decorative ring */}
              <div className="flex-shrink-0 relative">
                <div className={`absolute inset-0 rounded-full ${isSelected ? 'bg-urdu-gold/20 animate-pulse' : ''}`}></div>
                {conversation.type === "group" ? (
                  <div className="relative w-14 h-14 bg-gradient-to-br from-urdu-gold via-amber-500 to-urdu-brown rounded-full flex items-center justify-center shadow-lg ring-2 ring-urdu-gold/30 overflow-hidden">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                ) : (
                  (() => {
                    const otherParticipant = conversation.participants?.find(
                      (p) => p.user?._id !== currentUser?.id
                    );
                    const profileImagePath = otherParticipant?.user?.profileImage?.url;
                    const profileImage = getImageUrl(profileImagePath);
                    
                    console.log("🖼️ ConversationsList Avatar Debug:", {
                      conversationId: conversation._id,
                      otherParticipantName: otherParticipant?.user?.name,
                      otherParticipantId: otherParticipant?.user?._id,
                      profileImagePath: profileImagePath,
                      fullImageUrl: profileImage,
                      fullProfileImage: otherParticipant?.user?.profileImage,
                      allParticipants: conversation.participants?.map(p => ({
                        id: p.user?._id,
                        name: p.user?.name,
                        profileImage: p.user?.profileImage
                      }))
                    });
                    
                    return (
                      <div className="relative w-14 h-14 bg-gradient-to-br from-urdu-maroon via-rose-600 to-urdu-brown rounded-full flex items-center justify-center shadow-lg ring-2 ring-urdu-maroon/30 overflow-hidden">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt={otherParticipant?.user?.name || 'User'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error("❌ Image failed to load:", profileImage);
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                            }}
                          />
                        ) : (
                          <User className="w-7 h-7 text-white" />
                        )}
                      </div>
                    );
                  })()
                )}
                {conversation.unreadCount > 0 && (
                  <div className="absolute -top-1 -left-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-md ring-2 ring-white font-bold">
                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-bold truncate text-lg ${
                    isSelected ? 'text-urdu-maroon' : 'text-gray-800'
                  }`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {title}
                  </h3>

                  {/* Time with elegant styling */}
                  <div className="flex items-center space-x-1 space-x-reverse text-xs text-gray-500 bg-urdu-cream/30 px-2 py-1 rounded-full flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="nastaleeq-primary">
                      {formatTime(
                        conversation.lastActivity || conversation.createdAt
                      )}
                    </span>
                  </div>
                </div>

                {/* Last Message Preview with elegant box */}
                <div className="flex items-center justify-between mt-1">
                  <p
                    className={`text-sm truncate flex-1 nastaleeq-primary ${
                      conversation.unreadCount > 0 
                        ? 'text-gray-800 font-semibold' 
                        : 'text-gray-600'
                    }`}
                    dir="rtl"
                  >
                    {getLastMessagePreview(conversation)}
                  </p>
                </div>

                {/* Group Members Count with icon */}
                {conversation.type === "group" && (
                  <div className="flex items-center mt-2 text-xs text-gray-500 bg-urdu-gold/10 px-2 py-1 rounded-full w-fit">
                    <Users className="w-3 h-3 ml-1" />
                    <span className="nastaleeq-primary">
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
        );
      })}
    </div>
  );
};

export default ConversationsList;
