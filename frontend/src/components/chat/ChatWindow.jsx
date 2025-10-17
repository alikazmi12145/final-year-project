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
} from "lucide-react";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import api from "../../services/api";

const ChatWindow = ({ conversation, currentUser, onNewMessage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation?._id) {
      loadMessages();
    }
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
        setMessages(response.data.messages || []);
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
        setMessages((prev) => [...prev, sentMessage]);
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
        setMessages((prev) => [...prev, sentMessage]);

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

  const renderMessage = (message) => {
    const isOwnMessage = message.sender?._id === currentUser.id;
    const isSystemMessage = message.isSystemMessage;

    if (isSystemMessage) {
      return (
        <div key={message._id} className="flex justify-center my-4">
          <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm nastaleeq-primary">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={message._id}
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
          {!isOwnMessage && conversation.type === "group" && (
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

            {/* Message Time */}
            <div
              className={`text-xs mt-1 ${
                isOwnMessage ? "text-white/70" : "text-gray-500"
              }`}
            >
              {formatMessageTime(message.createdAt)}
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-urdu-maroon to-urdu-brown flex items-center justify-center ml-2 order-2">
            <User className="w-4 h-4 text-white" />
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
    <div className="h-full flex flex-col bg-gradient-to-br from-white to-urdu-cream/10">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
            {conversation.type === "group" ? (
              <Users className="w-5 h-5 text-white" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-urdu-brown nastaleeq-primary">
              {getConversationTitle()}
            </h3>
            <p className="text-xs text-gray-500 nastaleeq-primary">
              {conversation.type === "group"
                ? `${conversation.stats?.totalMembers || 0} اراکین`
                : "آن لائن"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
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

          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
      </div>
    </div>
  );
};

export default ChatWindow;
