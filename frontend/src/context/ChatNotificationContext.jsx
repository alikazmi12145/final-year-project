import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import socketService from "../services/socketService";
import api from "../services/api";

const ChatNotificationContext = createContext();

export const useChatNotifications = () => {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    throw new Error("useChatNotifications must be used within ChatNotificationProvider");
  }
  return context;
};

export const ChatNotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);

  // Load unread count and conversations on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log("🚀 ChatNotificationContext: Initializing for user:", user.id);
      
      // Connect socket first
      socketService.connect(user.id);
      
      // Then load conversations and setup listeners
      loadConversationsAndCount();
      
      // Setup socket listeners
      const handleNewMessage = (message) => {
        console.log("🔔 ChatNotificationContext: New message received", {
          messageId: message._id,
          conversationId: message.conversation,
          sender: message.sender?.name || message.sender,
          senderId: message.sender?._id || message.sender,
          currentUserId: user?.id,
        });

        // Get the actual sender ID (could be populated object or just ID string)
        const senderId = message.sender?._id || message.sender;
        const currentUserId = user?.id;

        // Don't increment unread count for messages sent by current user
        if (senderId === currentUserId) {
          console.log("⏭️ Skipping notification - message sent by current user");
          
          // Still update the lastMessage preview
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv._id === message.conversation) {
                return {
                  ...conv,
                  lastMessage: {
                    message: message,
                    timestamp: new Date(message.createdAt),
                    preview: message.content?.substring(0, 100) || message.messageType,
                  },
                };
              }
              return conv;
            })
          );
          return;
        }

        // Update conversations list - only increment unread for messages from others
        setConversations((prev) => {
          // Check if conversation exists in the list
          const convExists = prev.find(conv => conv._id === message.conversation);
          
          if (!convExists) {
            // Conversation not in list yet - reload all conversations
            console.log("⚠️ Conversation not found in list, reloading...");
            loadConversationsAndCount();
            return prev;
          }
          
          // Update existing conversation
          return prev.map((conv) => {
            if (conv._id === message.conversation) {
              const newUnread = (conv.unreadCount || 0) + 1;
              console.log(`📈 Increasing unread for conversation ${conv._id}: ${conv.unreadCount} → ${newUnread}`);
              return {
                ...conv,
                lastMessage: {
                  message: message,
                  timestamp: new Date(message.createdAt),
                  preview: message.content?.substring(0, 100) || message.messageType,
                },
                unreadCount: newUnread,
              };
            }
            return conv;
          });
        });

        // Increment global unread count
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          console.log(`📊 Global unread count: ${prev} → ${newCount}`);
          return newCount;
        });

        // Add to notifications list
        setNotifications((prev) => [
          {
            id: message._id,
            conversationId: message.conversation,
            sender: message.sender,
            content: message.content || message.messageType,
            timestamp: new Date(message.createdAt),
            read: false,
          },
          ...prev.slice(0, 9), // Keep last 10 notifications
        ]);
      };

      // Listen for messages being read
      const handleMessagesRead = ({ conversationId, userId, readAt }) => {
        console.log("👁️ Messages marked as read:", { conversationId, userId, readAt });
        
        // Reload conversations to get updated unread counts
        loadConversationsAndCount();
      };

      socketService.onNewMessage(handleNewMessage);
      socketService.socket?.on("messages_read", handleMessagesRead);
      
      // Cleanup function
      return () => {
        console.log("🧹 ChatNotificationContext: Cleaning up socket listeners");
        socketService.off("new_message", handleNewMessage);
        socketService.socket?.off("messages_read", handleMessagesRead);
      };
    }
  }, [isAuthenticated, user?.id]);

  const loadConversationsAndCount = async () => {
    try {
      const response = await api.chat.getConversations();
      if (response.data.success) {
        const convs = response.data.conversations || [];
        
        // Remove duplicates based on _id (just in case backend sends duplicates)
        const uniqueConvs = convs.reduce((acc, conv) => {
          const exists = acc.find(c => c._id === conv._id);
          if (!exists) {
            acc.push(conv);
          }
          return acc;
        }, []);
        
        setConversations(uniqueConvs);
        
        // Calculate total unread count
        const total = uniqueConvs.reduce(
          (sum, conv) => sum + (conv.unreadCount || 0),
          0
        );
        setUnreadCount(total);
        
        console.log("📊 Loaded conversations:", uniqueConvs.length, "Total unread:", total);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      console.log("📖 Marking conversation as read:", conversationId);
      
      // Call backend to mark messages as read
      await api.chat.markAsRead(conversationId);
      
      // Update local state immediately
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.conversationId === conversationId
            ? { ...notif, read: true }
            : notif
        )
      );

      // Recalculate total unread count from conversations
      setConversations((prev) => {
        const total = prev.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(total);
        console.log("📊 Updated total unread count:", total);
        return prev;
      });
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
    }
  };

  const clearNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value = {
    unreadCount,
    notifications,
    conversations,
    loadConversationsAndCount,
    markConversationAsRead,
    clearNotification,
    clearAllNotifications,
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};

export default ChatNotificationContext;
