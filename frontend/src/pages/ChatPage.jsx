import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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

const ChatPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("conversations"); // conversations, chatbot, support
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatType, setChatType] = useState("direct"); // direct, group
  const [searchTerm, setSearchTerm] = useState("");

  // Load conversations on component mount
  useEffect(() => {
    if (isAuthenticated && activeTab === "conversations") {
      loadConversations();
    }
  }, [isAuthenticated, activeTab]);

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

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleNewMessage = (conversationId, message) => {
    // Update conversations list with new message
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId
          ? {
              ...conv,
              lastMessage: message,
              unreadCount:
                conv._id === selectedConversation?._id
                  ? 0
                  : (conv.unreadCount || 0) + 1,
            }
          : conv
      )
    );
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
            <div className="w-1/3 border-r border-urdu-gold/20 bg-white/50 backdrop-blur-sm">
              <div className="p-4 border-b border-urdu-gold/20 bg-gradient-to-r from-urdu-cream/30 to-white/70">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-urdu-brown nastaleeq-heading">
                    گفتگو
                  </h2>
                  <Button
                    onClick={() => setShowNewChatModal(true)}
                    size="sm"
                    className="bg-urdu-maroon hover:bg-urdu-brown text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    نیا
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="تلاش کریں..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                    dir="rtl"
                  />
                </div>
              </div>

              <ConversationsList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onConversationSelect={handleConversationSelect}
                searchTerm={searchTerm}
                loading={loading}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1">
              {selectedConversation ? (
                <ChatWindow
                  conversation={selectedConversation}
                  currentUser={user}
                  onNewMessage={handleNewMessage}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-urdu-cream/20 to-white/50">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-urdu-maroon/20 to-urdu-gold/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <MessageSquare className="w-12 h-12 text-urdu-maroon/60" />
                    </div>
                    <h3 className="text-xl font-semibold text-urdu-brown mb-2 nastaleeq-heading">
                      گفتگو منتخب کریں
                    </h3>
                    <p className="text-gray-600 nastaleeq-primary">
                      اپنے دوستوں اور شاعروں سے بات چیت کریں
                    </p>
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
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream/20 via-white to-urdu-gold/10">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-urdu-gold/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-urdu-brown nastaleeq-heading">
                بزم سخن چیٹ
              </h1>
              <p className="text-sm text-gray-600 nastaleeq-primary">
                شاعروں اور قارئین سے رابطہ
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-2 bg-urdu-cream/30 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("conversations")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
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
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
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
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
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
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)]">
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
