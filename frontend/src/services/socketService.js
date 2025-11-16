import { io } from "socket.io-client";

// Socket.io connects to the root URL, not /api
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    // If socket exists but not connected, disconnect it first
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      this.socket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem("token"),
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        autoConnect: true,
      });

      this.setupDefaultListeners(userId);

      console.log("✅ Socket connected successfully");
    } catch (error) {
      console.error("❌ Socket connection error:", error);
    }
  }

  setupDefaultListeners(userId) {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected:", this.socket.id);
      this.isConnected = true;

      // Authenticate user
      if (userId) {
        this.socket.emit("authenticate", userId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      // Ignore connection errors from React StrictMode double-mounting
      if (error.message === "Invalid namespace") {
        return;
      }
      console.error("🔥 Socket connection error:", error.message);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      this.isConnected = true;
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Reconnection attempt:", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("🔥 Reconnection error:", error.message);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Failed to reconnect");
      this.isConnected = false;
    });
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.emit("join_conversation", conversationId);
    console.log("👥 Joined conversation:", conversationId);
  }

  // Leave a conversation room
  leaveConversation(conversationId) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("leave_conversation", conversationId);
    console.log("👋 Left conversation:", conversationId);
  }

  // Send a message
  sendMessage(conversationId, message) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.emit("send_message", {
      conversationId,
      message,
    });
  }

  // Typing indicators
  startTyping(conversationId, userName) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("typing_start", {
      conversationId,
      userName,
    });
  }

  stopTyping(conversationId) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("typing_stop", {
      conversationId,
    });
  }

  // Mark message as read
  markMessageRead(conversationId, messageId, userId) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("message_read", {
      conversationId,
      messageId,
      userId,
    });
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (!this.socket) return;

    // Register the callback directly on socket
    // This allows multiple components to listen simultaneously
    this.socket.on("new_message", callback);
    
    // Store in an array to support multiple listeners
    if (!this.listeners.has("new_message")) {
      this.listeners.set("new_message", []);
    }
    this.listeners.get("new_message").push(callback);
  }

  // Listen for user typing
  onUserTyping(callback) {
    if (!this.socket) return;

    this.socket.on("user_typing", callback);
    this.listeners.set("user_typing", callback);
  }

  // Listen for user stopped typing
  onUserStoppedTyping(callback) {
    if (!this.socket) return;

    this.socket.on("user_stopped_typing", callback);
    this.listeners.set("user_stopped_typing", callback);
  }

  // Listen for message read receipts
  onMessageRead(callback) {
    if (!this.socket) return;

    this.socket.on("message_read_receipt", callback);
    this.listeners.set("message_read_receipt", callback);
  }

  // Listen for user online status
  onUserOnline(callback) {
    if (!this.socket) return;

    this.socket.on("user_online", callback);
    this.listeners.set("user_online", callback);
  }

  // Listen for user offline status
  onUserOffline(callback) {
    if (!this.socket) return;

    this.socket.on("user_offline", callback);
    this.listeners.set("user_offline", callback);
  }

  // Remove specific listener
  off(event, specificCallback) {
    if (!this.socket) return;

    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    // If callbacks is an array (like new_message), remove specific callback
    if (Array.isArray(callbacks)) {
      if (specificCallback) {
        // Remove the specific callback
        this.socket.off(event, specificCallback);
        const index = callbacks.indexOf(specificCallback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        // If no more callbacks, remove the entry
        if (callbacks.length === 0) {
          this.listeners.delete(event);
        }
      } else {
        // Remove all callbacks for this event
        callbacks.forEach(cb => this.socket.off(event, cb));
        this.listeners.delete(event);
      }
    } else {
      // Single callback (old style)
      this.socket.off(event, callbacks);
      this.listeners.delete(event);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (!this.socket) return;

    this.listeners.forEach((callbacks, event) => {
      if (Array.isArray(callbacks)) {
        callbacks.forEach(cb => this.socket.off(event, cb));
      } else {
        this.socket.off(event, callbacks);
      }
    });

    this.listeners.clear();
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      
      // Only log if actually disconnecting an active connection
      if (this.socket.connected) {
        console.log("🔌 Socket disconnecting...");
      }
      
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
