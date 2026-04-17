import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  requestLogger,
  performanceMonitor,
  rateLimitFormatter,
} from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, ".env") });

import connectDB from "./config/database.js";
import passport from "passport";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Make io accessible to routes
app.set("io", io);

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize passport
app.use(passport.initialize());

// Enhanced logging and monitoring
app.use(requestLogger);
app.use(performanceMonitor);

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    mongodb: "connection will be tested on first request",
  });
});

// API root endpoint
app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "Bazm-e-Sukhan API root",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Start server with MongoDB connection
const PORT = process.env.PORT || 5000;

// Socket.io event handlers (must be before server starts)
function setupSocketHandlers(io) {
  // Store connected users with their online status
  const connectedUsers = new Map(); // Map<userId, {socketId, lastSeen}>

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // User authentication and registration
    socket.on("authenticate", (userId) => {
      socket.userId = userId;
      connectedUsers.set(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
        isOnline: true,
      });
      
      // Make the user join a room with their user ID
      // This allows us to send messages to specific users
      socket.join(userId);
      
      console.log(`✅ User authenticated: ${userId}`);
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Rooms: ${Array.from(socket.rooms)}`);
      console.log(`   Total connected users: ${connectedUsers.size}`);
      
      // Notify all users that this user is online
      socket.broadcast.emit("user_online", { 
        userId,
        lastSeen: new Date(),
      });
      
      // Send online users list to newly connected user
      const onlineUsers = Array.from(connectedUsers.entries()).map(([id, data]) => ({
        userId: id,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
      }));
      socket.emit("online_users", onlineUsers);
    });

    // Join conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`👥 User ${socket.userId} joined conversation: ${conversationId}`);
      console.log(`   Socket rooms: ${Array.from(socket.rooms)}`);
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId);
      console.log(`👋 User ${socket.userId} left conversation: ${conversationId}`);
    });

    // New message event
    socket.on("send_message", (data) => {
      const { conversationId, message } = data;
      // Broadcast to all users in the conversation except sender
      socket.to(conversationId).emit("new_message", message);
      console.log(`💬 Message sent in conversation: ${conversationId}`);
    });

    // Typing indicator
    socket.on("typing_start", (data) => {
      const { conversationId, userName } = data;
      socket.to(conversationId).emit("user_typing", { userName });
    });

    socket.on("typing_stop", (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit("user_stopped_typing");
    });

    // Message read receipt
    socket.on("message_read", (data) => {
      const { conversationId, messageId, userId } = data;
      socket.to(conversationId).emit("message_read_receipt", {
        messageId,
        userId,
        readAt: new Date(),
      });
    });

    // Call signaling events
    socket.on("initiate_call", (data) => {
      const { recipientId, callerId, callerName, callType, conversationId } = data;
      console.log(`📞 Call initiated: ${callerName} → Recipient ${recipientId} (${callType})`);
      
      // Send to recipient
      io.to(recipientId).emit("incoming_call", {
        caller: { _id: callerId, name: callerName },
        callType,
        conversationId,
      });
    });

    socket.on("accept_call", (data) => {
      const { callerId } = data;
      console.log(`✅ Call accepted by user ${socket.userId}`);
      
      io.to(callerId).emit("call_accepted", {
        userId: socket.userId,
      });
    });

    socket.on("reject_call", (data) => {
      const { callerId } = data;
      console.log(`❌ Call rejected by user ${socket.userId}`);
      
      io.to(callerId).emit("call_rejected", {
        userId: socket.userId,
      });
    });

    socket.on("end_call", (data) => {
      const { conversationId } = data;
      console.log(`📴 Call ended in conversation: ${conversationId}`);
      
      socket.to(conversationId).emit("call_ended", {
        userId: socket.userId,
      });
    });

    // WebRTC signaling (for peer-to-peer connection)
    socket.on("webrtc_offer", (data) => {
      const { recipientId, offer } = data;
      io.to(recipientId).emit("webrtc_offer", {
        offer,
        senderId: socket.userId,
      });
    });

    socket.on("webrtc_answer", (data) => {
      const { recipientId, answer } = data;
      io.to(recipientId).emit("webrtc_answer", {
        answer,
        senderId: socket.userId,
      });
    });

    socket.on("webrtc_ice_candidate", (data) => {
      const { recipientId, candidate } = data;
      io.to(recipientId).emit("webrtc_ice_candidate", {
        candidate,
        senderId: socket.userId,
      });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      if (socket.userId) {
        const userData = connectedUsers.get(socket.userId);
        if (userData) {
          userData.isOnline = false;
          userData.lastSeen = new Date();
          connectedUsers.set(socket.userId, userData);
          
          // Notify others that user went offline
          socket.broadcast.emit("user_offline", { 
            userId: socket.userId,
            lastSeen: userData.lastSeen,
          });
        }
        console.log(`❌ User disconnected: ${socket.userId}`);
        console.log(`   Last seen: ${new Date().toISOString()}`);
      }
    });
  });
}

// Initialize Socket.io handlers
setupSocketHandlers(io);

const startServer = async () => {
  try {
    // Try to connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message);
    console.log("⚠️ Server will continue without database connection");
  }

  try {
    // Load routes dynamically
    const authRoutes = await import("./routes/auth.js");
    const oauthRoutes = await import("./routes/oauth.js");
    const adminRoutes = await import("./routes/admin.js");
    const poetRoutes = await import("./routes/poets.js");
    const biographyRoutes = await import("./routes/biographies.js");
    const poemRoutes = await import("./routes/poems.js");
    const poetryCollectionRoutes = await import("./routes/poetryCollection.js");
    const contestRoutes = await import("./routes/contests.js");
    const quizRoutes = await import("./routes/quizzes.js");
    const learningRoutes = await import("./routes/learning.js");
    const searchRoutes = await import("./routes/search.js");
    const dashboardRoutes = await import("./routes/dashboard.js");
    const poetDashboardRoutes = await import("./routes/poetDashboard.js");
    const chatRoutes = await import("./routes/chat.js");
    const newsletterRoutes = await import("./routes/newsletter.js");
    const homepageRoutes = await import("./routes/homepage.js");
    const bookmarkRoutes = await import("./routes/bookmarks.js");
    const historyRoutes = await import("./routes/history.js");
    const pdfExportRoutes = await import("./routes/pdfExport.js");
    const aiSearchRoutes = await import("./routes/aiSearch.js");

    // Updates & Feedback Module routes
    const postRoutes = await import("./routes/posts.js");
    const commentRoutes = await import("./routes/comments.js");
    const notificationRoutes = await import("./routes/notifications.js");
    const feedbackRoutes = await import("./routes/feedback.js");

    // Apply routes
    app.use("/api/auth", authRoutes.default);
    app.use("/api/auth", oauthRoutes.default);
    app.use("/api/admin", adminRoutes.default);
    app.use("/api/poets", poetRoutes.default);
    app.use("/api/biographies", biographyRoutes.default);
    app.use("/api/poems", poemRoutes.default);
    app.use("/api/poetry", poetryCollectionRoutes.default);
    app.use("/api/contests", contestRoutes.default);
    app.use("/api/quizzes", quizRoutes.default);
    app.use("/api/learning", learningRoutes.default);
    app.use("/api/search", searchRoutes.default);
    app.use("/api/dashboard", dashboardRoutes.default);
    app.use("/api/poet-dashboard", poetDashboardRoutes.default);
    app.use("/api/chat", chatRoutes.default);
    app.use("/api/newsletter", newsletterRoutes.default);
    app.use("/api/homepage", homepageRoutes.default);
    app.use("/api/bookmarks", bookmarkRoutes.default);
    app.use("/api/history", historyRoutes.default);
    app.use("/api/pdf", pdfExportRoutes.default);
    app.use("/api/ai-search", aiSearchRoutes.default);

    // Updates & Feedback Module routes
    app.use("/api/posts", postRoutes.default);
    app.use("/api/comments", commentRoutes.default);
    app.use("/api/notifications", notificationRoutes.default);
    app.use("/api/feedback", feedbackRoutes.default);

    console.log("✅ Routes loaded successfully");
    console.log("🤖 AI Search routes available at /api/ai-search");

    // Catch-all POST handler for newsletter subscriptions sent to wrong path
    // This handles cases where the form might submit to "/" instead of "/api/newsletter/subscribe"
    app.post("/", async (req, res) => {
      const { email } = req.body;
      if (email) {
        // Redirect/forward to newsletter subscribe
        try {
          const Newsletter = (await import("./models/Newsletter.js")).default;
          
          // Check if email already exists
          const existingSubscriber = await Newsletter.findOne({ email });
          
          if (existingSubscriber) {
            if (existingSubscriber.isActive) {
              return res.status(400).json({
                success: false,
                message: "یہ ایمیل پہلے سے رجسٹرڈ ہے / This email is already subscribed",
              });
            } else {
              // Reactivate subscription
              existingSubscriber.isActive = true;
              existingSubscriber.subscribedAt = new Date();
              existingSubscriber.unsubscribedAt = null;
              await existingSubscriber.save();
              
              return res.status(200).json({
                success: true,
                message: "آپ کی سبسکرپشن دوبارہ فعال ہو گئی / Your subscription has been reactivated",
              });
            }
          }
          
          // Create new subscriber
          const newSubscriber = new Newsletter({ email, source: "root-fallback" });
          await newSubscriber.save();
          
          return res.status(201).json({
            success: true,
            message: "شکریہ! آپ نے کامیابی سے سبسکرائب کر لیا / Thank you for subscribing!",
          });
        } catch (error) {
          console.error("Newsletter fallback error:", error);
          return res.status(500).json({
            success: false,
            message: "کچھ غلط ہو گیا / Something went wrong",
          });
        }
      }
      
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });
  } catch (error) {
    console.log("❌ Error loading routes:", error.message);
    console.log("❌ Stack trace:", error.stack);
    console.log("⚠️ Server will continue with limited functionality");
  }

  // 404 handler (must be BEFORE error handler, AFTER routes)
  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  // Error handling middleware (must be LAST)
  app.use((err, req, res, next) => {
    console.error(
      `💥 Unhandled error in ${req.method} ${req.path}:`,
      err.stack
    );

    res.status(err.status || 500).json({
      success: false,
      message: "خرابی ہوئی، براہ کرم دوبارہ کوشش کریں", // Error occurred, please try again
      errorCode: "INTERNAL_SERVER_ERROR",
      requestId: req.requestId || Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
        stack: err.stack,
      }),
    });
  });

  // Start the server
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(
      `📱 Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`
    );
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("🔍 Server started successfully. Try accessing:");
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   API root: http://localhost:${PORT}/api`);
    console.log(`🔌 Socket.io server ready on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
