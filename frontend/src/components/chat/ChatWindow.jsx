import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  User,
  Users,
  Phone,
  Video,
  Info,
  Reply,
  Heart,
  ThumbsUp,
  Check,
  CheckCheck,
  Star,
  Trash2,
  Mic,
  X,
} from "lucide-react";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import MessageActionsMenu from "./MessageActionsMenu";
import ForwardMessageModal from "./ForwardMessageModal";
import MessageInfoModal from "./MessageInfoModal";
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import VideoCallWindow from "./VideoCallWindow";
import IncomingCallModal from "./IncomingCallModal";
import api from "../../services/api";
import socketService from "../../services/socketService";

// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  // Use base URL without /api for static files
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const cleanBaseUrl = baseUrl.replace('/api', '');
  return `${cleanBaseUrl}${imagePath}`;
};

const ChatWindow = ({ 
  conversation, 
  currentUser, 
  onNewMessage, 
  onMarkAsRead, 
  onConversationUpdate, 
  onConversationDelete 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showMessageInfo, setShowMessageInfo] = useState(null);
  const [starredMessages, setStarredMessages] = useState(new Set());
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState(null); // { type: 'video'|'audio', recipient }
  const [incomingCall, setIncomingCall] = useState(null); // { caller, type }
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation?._id) {
      loadMessages();
      // Join socket room for this conversation
      socketService.joinConversation(conversation._id);
    }

    return () => {
      // Leave socket room when component unmounts or conversation changes
      if (conversation?._id) {
        socketService.leaveConversation(conversation._id);
      }
    };
  }, [conversation?._id]);

  // Setup socket listeners for this conversation
  useEffect(() => {
    // Note: Global new_message listener is in ChatPage
    // Here we only handle conversation-specific events

    // Listen for typing indicators
    socketService.onUserTyping(({ userName }) => {
      setIsTyping(true);
      // Auto-hide typing indicator after 3 seconds
      setTimeout(() => setIsTyping(false), 3000);
    });

    socketService.onUserStoppedTyping(() => {
      setIsTyping(false);
    });

    // Listen for new messages in THIS conversation
    const handleNewMessage = (message) => {
      console.log("🔔 ChatWindow received new message:", message._id, "for conversation:", message.conversation);
      
      if (message.conversation === conversation?._id) {
        console.log("✅ Message is for THIS conversation, adding to messages");
        // Check if message already exists (prevent duplicates)
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) {
            console.log("⚠️ Message already exists, skipping");
            return prev;
          }
          console.log("✨ Adding new message to chat window");
          return [...prev, { ...message, isRead: false }];
        });
        
        // If message is from another user and this chat is currently open,
        // immediately mark it as read by reloading messages
        const isFromOther = (message.sender?._id || message.sender) !== currentUser?.id;
        if (isFromOther) {
          console.log("📖 Message from other user received while chat open - marking as read");
          // Small delay to ensure message is saved on server
          setTimeout(() => {
            loadMessages();
          }, 300);
        }
      } else {
        console.log("❌ Message is for different conversation, ignoring");
      }
    };

    // Listen for messages being marked as read
    const handleMessagesRead = ({ conversationId, userId, readAt }) => {
      if (conversationId === conversation?._id) {
        console.log("👁️ Messages marked as read in this conversation");
        // Update all messages to show as read
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            isRead: new Date(msg.createdAt) <= new Date(readAt)
          }))
        );
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.socket?.on("messages_read", handleMessagesRead);

    // Listen for incoming calls
    const handleIncomingCall = ({ caller, callType, conversationId }) => {
      if (conversationId === conversation?._id) {
        setIncomingCall({
          caller,
          type: callType,
        });
      }
    };

    // Listen for call accepted
    const handleCallAccepted = ({ userId }) => {
      console.log("✅ Call accepted by:", userId);
      // Call was accepted, connection will be established via WebRTC
    };

    // Listen for call rejected
    const handleCallRejected = ({ userId }) => {
      console.log("❌ Call rejected by:", userId);
      setIsInCall(false);
      setCurrentCall(null);
      alert("کال مسترد کر دی گئی");
    };

    // Listen for call ended
    const handleCallEnded = ({ userId }) => {
      console.log("📴 Call ended by:", userId);
      setIsInCall(false);
      setCurrentCall(null);
    };

    socketService.socket?.on("incoming_call", handleIncomingCall);
    socketService.socket?.on("call_accepted", handleCallAccepted);
    socketService.socket?.on("call_rejected", handleCallRejected);
    socketService.socket?.on("call_ended", handleCallEnded);

    return () => {
      socketService.off("user_typing");
      socketService.off("user_stopped_typing");
      // Pass the specific callback to remove it
      socketService.off("new_message", handleNewMessage);
      socketService.socket?.off("messages_read", handleMessagesRead);
      socketService.socket?.off("incoming_call", handleIncomingCall);
      socketService.socket?.off("call_accepted", handleCallAccepted);
      socketService.socket?.off("call_rejected", handleCallRejected);
      socketService.socket?.off("call_ended", handleCallEnded);
    };
  }, [conversation?._id]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.chat.getMessages(conversation._id);

      if (response.data.success) {
        const loadedMessages = response.data.messages || [];
        console.log("📥 Loaded messages:", loadedMessages.length, loadedMessages);
        console.log("👤 Current user ID:", currentUser?.id);
        
        // Find the other participant's lastReadAt time
        const otherParticipant = conversation.participants?.find(
          (p) => p.user?._id !== currentUser?.id && p.user?._id !== currentUser?._id
        );
        const otherLastReadAt = otherParticipant?.lastReadAt;
        
        // Mark messages as read based on lastReadAt
        const messagesWithReadStatus = loadedMessages.map(msg => ({
          ...msg,
          isRead: otherLastReadAt && new Date(msg.createdAt) <= new Date(otherLastReadAt)
        }));
        
        console.log("📖 Other participant lastReadAt:", otherLastReadAt);
        
        setMessages(messagesWithReadStatus);
        
        // Mark conversation as read in the notification context
        if (onMarkAsRead) {
          onMarkAsRead();
        }
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = () => {
    // Emit typing event
    socketService.startTyping(conversation._id, currentUser.name);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversation._id);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !replyTo) return;

    try {
      setSending(true);

      const messageData = {
        content: newMessage.trim(),
        messageType: "text",
      };

      if (replyTo) {
        messageData.replyToId = replyTo._id;
      }

      const response = await api.chat.sendMessage(
        conversation._id,
        messageData
      );

      if (response.data.success) {
        const sentMessage = response.data.message;
        // Don't add message here - let socket event handle it to avoid duplicates
        // setMessages((prev) => [...prev, sentMessage]);
        setNewMessage("");
        setReplyTo(null);

        // Notify parent component
        if (onNewMessage) {
          onNewMessage(conversation._id, sentMessage);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSending(true);

      const formData = new FormData();
      formData.append("attachment", file);
      formData.append("content", `فائل بھیجی گئی: ${file.name}`);
      formData.append(
        "messageType",
        file.type.startsWith("image/") ? "image" : "file"
      );

      const response = await api.chat.sendMessageWithFile(
        conversation._id,
        formData
      );

      if (response.data.success) {
        const sentMessage = response.data.message;
        // Don't add message here - let socket event handle it to avoid duplicates
        // setMessages((prev) => [...prev, sentMessage]);

        if (onNewMessage) {
          onNewMessage(conversation._id, sentMessage);
        }
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.chat.addReaction(messageId, emoji);

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                reactions: [
                  ...msg.reactions.filter((r) => r.user._id !== currentUser.id),
                  {
                    user: { _id: currentUser.id, name: currentUser.name },
                    emoji,
                    timestamp: new Date(),
                  },
                ],
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handleCopyMessage = (message) => {
    console.log("Message copied:", message.content);
  };

  const handleStarMessage = (message) => {
    setStarredMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(message._id)) {
        newSet.delete(message._id);
      } else {
        newSet.add(message._id);
      }
      return newSet;
    });
  };

  const handleDeleteMessage = async (message) => {
    if (!window.confirm("کیا آپ واقعی یہ پیغام حذف کرنا چاہتے ہیں؟")) {
      return;
    }

    try {
      // TODO: Implement delete message API
      setMessages((prev) => prev.filter((msg) => msg._id !== message._id));
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleSendVoiceMessage = async (audioBlob, duration) => {
    try {
      setSending(true);

      const formData = new FormData();
      formData.append("attachment", audioBlob, "voice-message.webm");
      formData.append("content", `پیغام صوتی - ${Math.floor(duration)}س`);
      formData.append("messageType", "audio");

      const response = await api.chat.sendMessageWithFile(
        conversation._id,
        formData
      );

      if (response.data.success) {
        setShowVoiceRecorder(false);
        if (onNewMessage) {
          onNewMessage(conversation._id, response.data.message);
        }
      }
    } catch (error) {
      console.error("Failed to send voice message:", error);
      alert("Failed to send voice message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const initiateCall = (isVideo = false) => {
    const otherParticipant = conversation.participants?.find(
      (p) => p.user?._id !== currentUser.id
    );

    if (!otherParticipant) return;

    setCurrentCall({
      type: isVideo ? "video" : "audio",
      recipient: otherParticipant.user,
      isIncoming: false,
    });
    setIsInCall(true);

    // Emit call signal via Socket.io
    socketService.socket?.emit("initiate_call", {
      recipientId: otherParticipant.user._id,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callType: isVideo ? "video" : "audio",
      conversationId: conversation._id,
    });
  };

  const handleAcceptCall = () => {
    setIsInCall(true);
    setCurrentCall(incomingCall);
    setIncomingCall(null);

    // Emit acceptance via Socket.io
    socketService.socket?.emit("accept_call", {
      callerId: incomingCall.caller._id,
    });
  };

  const handleRejectCall = () => {
    setIncomingCall(null);

    // Emit rejection via Socket.io
    if (incomingCall) {
      socketService.socket?.emit("reject_call", {
        callerId: incomingCall.caller._id,
      });
    }
  };

  const handleEndCall = () => {
    setIsInCall(false);
    setCurrentCall(null);

    // Emit call end via Socket.io
    socketService.socket?.emit("end_call", {
      conversationId: conversation._id,
    });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ur-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getConversationTitle = () => {
    if (conversation.type === "group") {
      return conversation.groupInfo?.name || "گروپ چیٹ";
    } else {
      const otherParticipant = conversation.participants?.find(
        (p) => p.user?._id !== currentUser.id
      );
      return otherParticipant?.user?.name || "نامعلوم صارف";
    }
  };

  // Admin handler functions
  const handleRemoveParticipant = async (userId) => {
    if (!window.confirm('کیا آپ واقعی اس رکن کو نکالنا چاہتے ہیں؟')) return;
    
    try {
      // API call to remove participant
      await api.chat.removeParticipant(conversation._id, userId);
      
      // Update local conversation state
      if (onConversationUpdate) {
        onConversationUpdate(conversation._id);
      }
      
      alert('رکن کامیابی سے نکال دیا گیا');
    } catch (error) {
      console.error('Failed to remove participant:', error);
      alert('رکن نکالنے میں خرابی');
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('کیا آپ واقعی اس چیٹ کو صاف کرنا چاہتے ہیں؟ تمام پیغامات حذف ہو جائیں گے۔')) return;
    
    try {
      await api.chat.clearMessages(conversation._id);
      setMessages([]);
      alert('چیٹ کامیابی سے صاف ہو گئی');
    } catch (error) {
      console.error('Failed to clear chat:', error);
      alert('چیٹ صاف کرنے میں خرابی');
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm('کیا آپ واقعی اس گفتگو کو مستقل طور پر حذف کرنا چاہتے ہیں؟')) return;
    
    try {
      await api.chat.deleteConversation(conversation._id);
      
      // Notify parent component to update conversation list
      if (onConversationDelete) {
        onConversationDelete(conversation._id);
      }
      
      alert('گفتگو کامیابی سے حذف ہو گئی');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('گفتگو حذف کرنے میں خرابی');
    }
  };

  // Group consecutive messages from the same sender
  const groupMessages = (messages) => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((message, index) => {
      const senderId = typeof message.sender === 'object' 
        ? message.sender?._id 
        : message.sender;
      
      const prevMessage = messages[index - 1];
      const prevSenderId = prevMessage 
        ? (typeof prevMessage.sender === 'object' ? prevMessage.sender?._id : prevMessage.sender)
        : null;

      // Check if this message should be grouped with previous
      const isSameSender = senderId === prevSenderId;
      const timeDiff = prevMessage 
        ? new Date(message.createdAt) - new Date(prevMessage.createdAt)
        : Infinity;
      const shouldGroup = isSameSender && timeDiff < 60000; // Group if within 1 minute

      if (shouldGroup && currentGroup) {
        currentGroup.messages.push(message);
      } else {
        currentGroup = {
          senderId,
          sender: message.sender,
          messages: [message],
          isOwnMessage: senderId === currentUser?.id || senderId === currentUser?._id,
        };
        groups.push(currentGroup);
      }
    });

    return groups;
  };

  const renderMessageGroup = (group, groupIndex) => {
    const { senderId, sender, messages, isOwnMessage } = group;
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const isSystemMessage = firstMessage.isSystemMessage;

    if (isSystemMessage) {
      return (
        <div key={groupIndex} className="flex justify-center my-4">
          <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm nastaleeq-primary">
            {firstMessage.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={groupIndex}
        className={`flex mb-4 ${isOwnMessage ? "justify-end" : "justify-start"}`}
      >
        {/* Avatar (only show for first message in group) */}
        {!isOwnMessage && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-urdu-maroon to-urdu-brown flex items-center justify-center ml-2 flex-shrink-0 self-end">
            <User className="w-4 h-4 text-white" />
          </div>
        )}

        <div className={`max-w-xs lg:max-w-md space-y-1`}>
          {/* Sender Name (only show once at top of group) */}
          {!isOwnMessage && (conversation.chatType === "group" || conversation.type === "group") && (
            <p className="text-xs text-gray-600 mb-1 px-2 nastaleeq-primary">
              {sender?.name || "نامعلوم"}
            </p>
          )}

          {/* Render all messages in group */}
          {messages.map((message, msgIndex) => (
            <div key={message._id}>
              {/* Reply Reference */}
              {message.replyTo && (
                <div className="bg-gray-100 border-l-4 border-urdu-gold p-2 mb-1 rounded text-xs">
                  <p className="text-gray-600 nastaleeq-primary">
                    جواب: {message.replyTo.content?.substring(0, 50)}...
                  </p>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`px-4 py-2 rounded-2xl shadow-sm relative group ${
                  isOwnMessage
                    ? "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white"
                    : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                {/* Starred indicator */}
                {starredMessages.has(message._id) && (
                  <Star className="w-3 h-3 text-yellow-500 absolute top-1 left-1 fill-current" />
                )}

                {/* Message Content - Handle different types */}
                {message.messageType === "audio" ? (
                  <VoiceMessagePlayer
                    audioUrl={message.attachments?.[0]?.url || message.content}
                    duration={message.attachments?.[0]?.duration || message.duration || 0}
                    isOwnMessage={isOwnMessage}
                  />
                ) : message.messageType === "image" ? (
                  <div>
                    <img
                      src={message.attachments?.[0]?.url}
                      alt="Shared image"
                      className="max-w-full rounded-lg mb-2"
                    />
                    {message.content && (
                      <p className="nastaleeq-primary text-sm leading-relaxed" dir="rtl">
                        {message.content}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="nastaleeq-primary text-sm leading-relaxed" dir="rtl">
                    {message.content}
                  </p>
                )}

                {/* Message Actions - New Dropdown Menu */}
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 ${
                    isOwnMessage ? "left-0" : "right-0"
                  } bg-white shadow-lg rounded-lg flex items-center space-x-1 p-1 z-10`}
                >
                  <button
                    onClick={() => setReplyTo(message)}
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                    title="جواب دیں"
                  >
                    <Reply className="w-3 h-3 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleReaction(message._id, "❤️")}
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                    title="پسند"
                  >
                    <Heart className="w-3 h-3 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleReaction(message._id, "👍")}
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                    title="اچھا"
                  >
                    <ThumbsUp className="w-3 h-3 text-gray-600" />
                  </button>
                  <MessageActionsMenu
                    message={{ ...message, isStarred: starredMessages.has(message._id) }}
                    isOwnMessage={isOwnMessage}
                    onReply={() => setReplyTo(message)}
                    onForward={() => setForwardMessage(message)}
                    onCopy={handleCopyMessage}
                    onStar={handleStarMessage}
                    onDelete={handleDeleteMessage}
                    onInfo={() => setShowMessageInfo(message)}
                    position={isOwnMessage ? "left" : "right"}
                  />
                </div>

                {/* Message Time and Read Status (only show on last message in group) */}
                {msgIndex === messages.length - 1 && (
                  <div
                    className={`flex items-center space-x-1 text-xs mt-1 ${
                      isOwnMessage ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    <span>{formatMessageTime(message.createdAt)}</span>
                    
                    {/* Show double tick for own messages */}
                    {isOwnMessage && (
                      <span className="inline-flex" title={message.isRead ? "دیکھا گیا" : "بھیجا گیا"}>
                        {message.isRead ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex space-x-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <span
                        key={index}
                        className="text-xs bg-white/20 px-2 py-1 rounded-full"
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessage = (message) => {
    // Handle both sender._id and sender (sometimes sender is just an ID string)
    const senderId = typeof message.sender === 'object' 
      ? message.sender?._id 
      : message.sender;
    
    const isOwnMessage = senderId === currentUser?.id || senderId === currentUser?._id;
    const isSystemMessage = message.isSystemMessage;

    console.log("🔍 Rendering message:", {
      messageId: message._id,
      senderId: senderId,
      senderName: message.sender?.name,
      currentUserId: currentUser?.id,
      currentUser_id: currentUser?._id,
      isOwnMessage,
      content: message.content
    });

    if (isSystemMessage) {
      return (
        <div className="flex justify-center my-4">
          <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm nastaleeq-primary">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex mb-4 ${
          isOwnMessage ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`max-w-xs lg:max-w-md ${
            isOwnMessage ? "order-2" : "order-1"
          }`}
        >
          {/* Sender Name (for group chats and other's messages) */}
          {!isOwnMessage && (conversation.chatType === "group" || conversation.type === "group") && (
            <p className="text-xs text-gray-600 mb-1 px-2 nastaleeq-primary">
              {message.sender?.name || "نامعلوم"}
            </p>
          )}

          {/* Reply Reference */}
          {message.replyTo && (
            <div className="bg-gray-100 border-l-4 border-urdu-gold p-2 mb-2 rounded text-xs">
              <p className="text-gray-600 nastaleeq-primary">
                جواب: {message.replyTo.content?.substring(0, 50)}...
              </p>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`px-4 py-2 rounded-2xl shadow-sm relative group ${
              isOwnMessage
                ? "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white"
                : "bg-white text-gray-800 border border-gray-200"
            }`}
          >
            <p className="nastaleeq-primary text-sm leading-relaxed" dir="rtl">
              {message.content}
            </p>

            {/* Message Actions */}
            <div
              className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 ${
                isOwnMessage ? "left-0" : "right-0"
              } bg-white shadow-lg rounded-lg flex space-x-1 p-1`}
            >
              <button
                onClick={() => setReplyTo(message)}
                className="p-1 hover:bg-gray-100 rounded text-xs"
                title="جواب دیں"
              >
                <Reply className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleReaction(message._id, "❤️")}
                className="p-1 hover:bg-gray-100 rounded text-xs"
                title="پسند"
              >
                <Heart className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleReaction(message._id, "👍")}
                className="p-1 hover:bg-gray-100 rounded text-xs"
                title="اچھا"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
            </div>

            {/* Message Time and Read Status */}
            <div
              className={`flex items-center space-x-1 text-xs mt-1 ${
                isOwnMessage ? "text-white/70" : "text-gray-500"
              }`}
            >
              <span>{formatMessageTime(message.createdAt)}</span>
              
              {/* Show double tick for own messages */}
              {isOwnMessage && (
                <span className="inline-flex" title={message.isRead ? "بھیجا گیا" : "دیکھا گیا"}>
                  {message.isRead ? (
                    <CheckCheck className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </span>
              )}
            </div>

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex space-x-1 mt-2">
                {message.reactions.map((reaction, index) => (
                  <span
                    key={index}
                    className="text-xs bg-white/20 px-2 py-1 rounded-full"
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Avatar */}
        {!isOwnMessage && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-urdu-maroon to-urdu-brown flex items-center justify-center ml-2 order-2 overflow-hidden flex-shrink-0">
            {(() => {
              const profileImagePath = message.sender?.profileImage?.url;
              const profileImage = getImageUrl(profileImagePath);
              console.log("🖼️ Message Avatar Debug:", {
                messageId: message._id,
                senderId: message.sender?._id,
                senderName: message.sender?.name,
                profileImagePath: profileImagePath,
                fullImageUrl: profileImage,
                fullProfileImage: message.sender?.profileImage,
                fullSender: message.sender
              });
              
              return profileImage ? (
                <img 
                  src={profileImage} 
                  alt={message.sender?.name || 'User'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("❌ Message avatar failed to load:", profileImage);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <User className="w-4 h-4 text-white" />
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 nastaleeq-primary">کوئی گفتگو منتخب نہیں</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Header - STICKY AT TOP */}
      <div className="sticky top-0 z-50 flex-shrink-0 bg-white border-b-2 border-urdu-maroon px-6 py-5 shadow-md">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Avatar and Name */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center shadow-xl flex-shrink-0 overflow-hidden">
              {conversation.type === "group" ? (
                <Users className="w-8 h-8 text-white" />
              ) : (
                <>
                  {(() => {
                    const otherParticipant = conversation.participants?.find(
                      (p) => p.user?._id !== currentUser.id
                    );
                    const profileImagePath = otherParticipant?.user?.profileImage?.url;
                    const profileImage = getImageUrl(profileImagePath);
                    
                    console.log("🖼️ ChatWindow Header Avatar Debug:", {
                      conversationId: conversation._id,
                      otherParticipantName: otherParticipant?.user?.name,
                      otherParticipantId: otherParticipant?.user?._id,
                      profileImagePath: profileImagePath,
                      fullImageUrl: profileImage,
                      fullProfileImage: otherParticipant?.user?.profileImage,
                      currentUserId: currentUser.id,
                      allParticipants: conversation.participants?.map(p => ({
                        id: p.user?._id,
                        name: p.user?.name,
                        profileImage: p.user?.profileImage
                      }))
                    });
                    
                    return profileImage ? (
                      <img 
                        src={profileImage} 
                        alt={otherParticipant?.user?.name || 'User'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("❌ Header image failed to load:", profileImage);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    );
                  })()}
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-bold text-black mb-2 truncate">
                {getConversationTitle()}
              </h2>
              <div className="text-lg text-gray-700 flex items-center gap-2">
                {conversation.type === "group" ? (
                  <>
                    <Users className="w-5 h-5" />
                    <span className="font-medium">{conversation.stats?.totalMembers || conversation.participants?.length || 0} اراکین</span>
                  </>
                ) : (
                  <span className="text-green-600 font-medium">● آن لائن</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => initiateCall(false)}
              className="p-4 bg-green-100 hover:bg-green-200 rounded-xl transition-all shadow-md hover:shadow-lg"
              title="آواز کی کال"
            >
              <Phone className="w-6 h-6 text-green-700" />
            </button>
            <button 
              onClick={() => initiateCall(true)}
              className="p-4 bg-blue-100 hover:bg-blue-200 rounded-xl transition-all shadow-md hover:shadow-lg"
              title="ویڈیو کال"
            >
              <Video className="w-6 h-6 text-blue-700" />
            </button>
            <button 
              onClick={() => setShowConversationInfo(!showConversationInfo)}
              className="p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all shadow-md hover:shadow-lg"
              title="معلومات"
            >
              <Info className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Conversation Info Panel - Slides down when info button clicked */}
        {showConversationInfo && (
          <div className="mt-4 p-4 bg-urdu-cream/20 rounded-xl border border-urdu-gold/30 animate-slideDown">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-urdu-brown">معلومات</h4>
                <button 
                  onClick={() => setShowConversationInfo(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Group Info */}
              {conversation.type === "group" && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-urdu-maroon" />
                    <span className="font-medium">اراکین: {conversation.participants?.length || 0}</span>
                  </div>
                  
                  {/* Participants List */}
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {conversation.participants?.map((participant, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-urdu-maroon rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {participant.user?.profileImage?.url ? (
                              <img 
                                src={getImageUrl(participant.user.profileImage.url)} 
                                alt={participant.user?.name || 'User'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <span className="text-sm">{participant.user?.name || 'نامعلوم'}</span>
                        </div>
                        
                        {/* Admin Controls - Only show if current user is admin */}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                          <button 
                            onClick={() => handleRemoveParticipant(participant.user?._id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="نکالیں"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {/* Direct Chat Info */}
              {conversation.type !== "group" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-urdu-maroon" />
                    <span className="font-medium">{getConversationTitle()}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="text-green-600">● آن لائن</span>
                  </div>
                </div>
              )}
              
              {/* Admin Actions */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                <div className="mt-4 pt-4 border-t border-urdu-gold/30">
                  <h5 className="font-bold text-sm text-urdu-brown mb-2">ایڈمن کنٹرولز</h5>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleClearChat}
                      className="flex-1 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm transition-all"
                    >
                      چیٹ صاف کریں
                    </button>
                    <button 
                      onClick={handleDeleteConversation}
                      className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm transition-all"
                    >
                      گفتگو حذف کریں
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {groupMessages(messages).map((group, groupIndex) => (
              <React.Fragment key={`group-${groupIndex}`}>
                {renderMessageGroup(group, groupIndex)}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="bg-urdu-cream/30 border-t border-urdu-gold/20 p-3 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-urdu-brown font-medium nastaleeq-primary">
              {replyTo.sender?.name || "نامعلوم"} کو جواب
            </p>
            <p className="text-xs text-gray-600 nastaleeq-primary" dir="rtl">
              {replyTo.content?.substring(0, 100)}...
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReplyTo(null)}>
            ×
          </Button>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSendVoice={handleSendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={sending}
              title="پیغام صوتی"
            >
              <Mic className="w-4 h-4" />
            </Button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="پیغام لکھیں..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                dir="rtl"
                disabled={sending}
              />
            </div>

            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-urdu-maroon hover:bg-urdu-brown text-white"
            >
              {sending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <p className="text-xs text-gray-500 mt-2 nastaleeq-primary">
            کوئی لکھ رہا ہے...
          </p>
        )}
      </div>

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={!!forwardMessage}
        onClose={() => setForwardMessage(null)}
        message={forwardMessage}
        currentUser={currentUser}
      />

      {/* Message Info Modal */}
      <MessageInfoModal
        isOpen={!!showMessageInfo}
        onClose={() => setShowMessageInfo(null)}
        message={showMessageInfo}
        conversation={conversation}
      />

      {/* Video/Audio Call Window */}
      <VideoCallWindow
        isActive={isInCall && currentCall}
        onEndCall={handleEndCall}
        recipientName={currentCall?.recipient?.name}
        recipientId={currentCall?.recipient?._id}
        isVideoCall={currentCall?.type === "video"}
        isIncoming={currentCall?.isIncoming}
      />

      {/* Incoming Call Modal */}
      <IncomingCallModal
        isOpen={!!incomingCall}
        callerName={incomingCall?.caller?.name}
        callerImage={incomingCall?.caller?.profileImage}
        isVideoCall={incomingCall?.type === "video"}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </div>
  );
};

export default ChatWindow;
