import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useChatNotifications } from "../context/ChatNotificationContext";
import {
  MessageSquare,
  Users,
  Bot,
  Headphones,
  Plus,
  Search,
  User,
  Clock,
  CheckCircle,
  Archive,
  Settings,
} from "lucide-react";
import ConversationsList from "../components/chat/ConversationsList";
import ChatWindow from "../components/chat/ChatWindow";
import ChatBot from "../components/chat/ChatBot";
import SupportTicket from "../components/chat/SupportTicket";
import NewChatModal from "../components/chat/NewChatModal";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import api from "../services/api";
import socketService from "../services/socketService";

const ChatPage = ({ embedded = false }) => {
  const { user, isAuthenticated } = useAuth();
  const { conversations: globalConversations, loadConversationsAndCount, markConversationAsRead } = useChatNotifications();
  const [activeTab, setActiveTab] = useState("conversations"); // conversations, chatbot, support
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatType, setChatType] = useState("direct"); // direct, group
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      socketService.connect(user.id);
      
      // Note: Socket message listeners are handled in ChatNotificationContext
      // We don't need duplicate listeners here

      return () => {
        // Don't disconnect socket here - let ChatNotificationContext manage it
      };
    }
  }, [isAuthenticated, user]);

  // Load conversations on component mount and sync with global context
  useEffect(() => {
    if (isAuthenticated && activeTab === "conversations") {
      setLoading(true);
      loadConversationsAndCount().finally(() => setLoading(false)); // Load from global context
    }
  }, [isAuthenticated, activeTab]);

  // Sync local conversations with global context
  useEffect(() => {
    if (globalConversations && globalConversations.length >= 0) {
      console.log("📋 ChatPage: Syncing conversations from global context:", globalConversations.length);
      setConversations(globalConversations);
      setLoading(false);
    }
  }, [globalConversations]);

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    
    // Always mark conversation as read when selected to clear any stale notifications
    markConversationAsRead(conversation._id);
  };

  const handleNewMessage = (conversationId, message) => {
    // No need to update local state - global context handles this
    // Just reload from global context to ensure consistency
    loadConversationsAndCount();
  };

  const handleChatCreated = (newConversation) => {
    // Add new conversation to list and select it
    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversation(newConversation);
    setShowNewChatModal(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "conversations":
        return (
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-urdu-gold/30 bg-gradient-to-br from-urdu-cream/20 via-white to-urdu-gold/5 backdrop-blur-sm shadow-inner flex flex-col">
              {/* Header - Hide when conversation is selected in embedded mode */}
              {(!embedded || !selectedConversation) && (
                <div className="p-4 border-b border-urdu-gold/30 bg-gradient-to-r from-urdu-maroon/10 via-urdu-cream/30 to-urdu-gold/10 backdrop-blur-md flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-urdu-maroon nastaleeq-heading flex items-center">
                      <MessageSquare className="w-6 h-6 ml-2" />
                      گفتگو
                    </h2>
                    <Button
                      onClick={() => setShowNewChatModal(true)}
                      size="sm"
                      className="bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      <span className="nastaleeq-primary">نیا</span>
                    </Button>
                  </div>

                  {/* Search with decorative styling */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-urdu-maroon/60 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="تلاش کریں..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-urdu-gold/30 rounded-xl focus:ring-2 focus:ring-urdu-maroon focus:border-urdu-maroon bg-white/80 backdrop-blur-sm nastaleeq-primary text-base shadow-sm hover:shadow-md transition-shadow"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}

              <ConversationsList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onConversationSelect={handleConversationSelect}
                searchTerm={searchTerm}
                loading={loading}
                currentUser={user}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1 h-full overflow-hidden">
              {selectedConversation ? (
                <ChatWindow
                  conversation={selectedConversation}
                  currentUser={user}
                  onNewMessage={handleNewMessage}
                  onMarkAsRead={() => markConversationAsRead(selectedConversation._id)}
                  onConversationUpdate={(conversationId) => {
                    // Reload conversations list when conversation is updated
                    loadConversations();
                  }}
                  onConversationDelete={(conversationId) => {
                    // Remove from list and clear selection
                    setConversations(prev => prev.filter(c => c._id !== conversationId));
                    setSelectedConversation(null);
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-urdu-cream/30 via-white to-urdu-gold/20 relative overflow-hidden">
                  {/* Decorative background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-10 right-10 w-32 h-32 bg-urdu-maroon rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-10 w-40 h-40 bg-urdu-gold rounded-full blur-3xl"></div>
                  </div>
                  
                  <div className="text-center relative z-10">
                    <div className="w-32 h-32 bg-gradient-to-br from-urdu-maroon/20 via-urdu-gold/20 to-urdu-brown/20 rounded-full flex items-center justify-center mb-6 mx-auto shadow-2xl ring-8 ring-urdu-gold/10 animate-pulse">
                      <MessageSquare className="w-16 h-16 text-urdu-maroon/70" />
                    </div>
                    <h3 className="text-3xl font-bold text-urdu-maroon mb-3 nastaleeq-heading">
                      گفتگو منتخب کریں
                    </h3>
                    <p className="text-gray-600 nastaleeq-primary text-lg max-w-md mx-auto leading-relaxed">
                      اپنے دوستوں، شاعروں اور قارئین سے بات چیت کریں
                    </p>
                    <div className="mt-8 flex items-center justify-center space-x-4 space-x-reverse">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-urdu-gold/20 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Users className="w-6 h-6 text-urdu-gold" />
                        </div>
                        <p className="text-xs text-gray-500 nastaleeq-primary">گروپ چیٹ</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-urdu-maroon/20 rounded-full flex items-center justify-center mx-auto mb-2">
                          <User className="w-6 h-6 text-urdu-maroon" />
                        </div>
                        <p className="text-xs text-gray-500 nastaleeq-primary">نجی چیٹ</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "chatbot":
        return <ChatBot currentUser={user} onCreateChat={handleChatCreated} />;

      case "support":
        return <SupportTicket currentUser={user} />;

      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-urdu-gold/20">
          <MessageSquare className="w-16 h-16 text-urdu-maroon mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-urdu-brown mb-4 nastaleeq-heading">
            گفتگو کے لیے لاگ ان کریں
          </h2>
          <p className="text-gray-600 mb-6 nastaleeq-primary">
            دوسرے شاعروں اور قارئین سے بات چیت کرنے کے لیے پہلے لاگ ان کریں
          </p>
          <Button
            onClick={() => (window.location.href = "/auth")}
            className="bg-urdu-maroon hover:bg-urdu-brown text-white"
          >
            لاگ ان کریں
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "h-full flex flex-col bg-gradient-to-br from-urdu-cream/20 to-white" : "min-h-screen bg-gradient-to-br from-urdu-cream/20 via-white to-urdu-gold/10"}>
      {/* Header - Show in both embedded and regular mode */}
      <div className={`bg-white/90 backdrop-blur-sm border-b border-urdu-gold/30 ${embedded ? 'flex-shrink-0' : 'sticky top-0'} z-10 shadow-sm`}>
        <div className={embedded ? "px-6 py-3" : "max-w-7xl mx-auto px-4 py-4"}>
          <div className="flex items-center justify-between">
            {!embedded && (
              <div>
                <h1 className="text-2xl font-bold text-urdu-brown nastaleeq-heading">
                  بزم سخن چیٹ
                </h1>
                <p className="text-sm text-gray-600 nastaleeq-primary">
                  شاعروں اور قارئین سے رابطہ
                </p>
              </div>
            )}

            {/* Tab Navigation - Always visible */}
            <div className={`flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-urdu-cream/40 to-urdu-gold/20 rounded-xl p-1 ${embedded ? 'w-full justify-center' : ''}`}>
              <button
                onClick={() => setActiveTab("conversations")}
                className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-all ${
                  activeTab === "conversations"
                    ? "bg-urdu-maroon text-white shadow-md"
                    : "text-urdu-brown hover:bg-white/50"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium nastaleeq-primary">
                  گفتگو
                </span>
              </button>

              <button
                onClick={() => setActiveTab("chatbot")}
                className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-all ${
                  activeTab === "chatbot"
                    ? "bg-urdu-maroon text-white shadow-md"
                    : "text-urdu-brown hover:bg-white/50"
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium nastaleeq-primary">
                  مددگار
                </span>
              </button>

              <button
                onClick={() => setActiveTab("support")}
                className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-all ${
                  activeTab === "support"
                    ? "bg-urdu-maroon text-white shadow-md"
                    : "text-urdu-brown hover:bg-white/50"
                }`}
              >
                <Headphones className="w-4 h-4" />
                <span className="text-sm font-medium nastaleeq-primary">
                  سپورٹ
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={embedded ? "flex-1 h-full overflow-hidden" : "max-w-7xl mx-auto h-[calc(100vh-180px)] overflow-hidden"}>
        {renderTabContent()}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={handleChatCreated}
        currentUser={user}
      />
    </div>
  );
};

export default ChatPage;
