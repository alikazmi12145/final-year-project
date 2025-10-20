import React, { createContext, useContext, useState, useCallback } from "react";
import CulturalMessagePopup from "../components/ui/CulturalMessagePopup";

const MessageContext = createContext();

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
};

export const MessageProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  const showMessage = useCallback((message, type = "info", options = {}) => {
    const id = Date.now() + Math.random();
    const newMessage = {
      id,
      message,
      type,
      duration: options.duration || 4000,
      position: options.position || "top-center",
      ...options,
    };

    setMessages((prev) => [...prev, newMessage]);

    // Auto remove after duration
    if (newMessage.duration > 0) {
      setTimeout(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
      }, newMessage.duration);
    }

    return id;
  }, []);

  const hideMessage = useCallback((id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const hideAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Convenience methods for different message types
  const showSuccess = useCallback(
    (message, options = {}) => {
      return showMessage(message, "success", options);
    },
    [showMessage]
  );

  const showError = useCallback(
    (message, options = {}) => {
      return showMessage(message, "error", options);
    },
    [showMessage]
  );

  const showWarning = useCallback(
    (message, options = {}) => {
      return showMessage(message, "warning", options);
    },
    [showMessage]
  );

  const showInfo = useCallback(
    (message, options = {}) => {
      return showMessage(message, "info", options);
    },
    [showMessage]
  );

  const value = {
    showMessage,
    hideMessage,
    hideAllMessages,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    messages,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}

      {/* Render all active messages */}
      {messages.map((msg) => (
        <CulturalMessagePopup
          key={msg.id}
          message={msg.message}
          type={msg.type}
          isVisible={true}
          onClose={() => hideMessage(msg.id)}
          duration={0} // Duration is handled by the provider
          position={msg.position}
        />
      ))}
    </MessageContext.Provider>
  );
};

export default MessageProvider;
