import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
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
    const learningRoutes = await import("./routes/learning.js");
    const searchRoutes = await import("./routes/search.js");
    const dashboardRoutes = await import("./routes/dashboard.js");
    const rekhtaRoutes = await import("./routes/rekhta.js");
    const adminDashboardRoutes = await import("./routes/adminDashboard.js");
    const poetDashboardRoutes = await import("./routes/poetDashboard.js");
    const chatRoutes = await import("./routes/chat.js");

    // Apply routes
    app.use("/api/auth", authRoutes.default);
    app.use("/api/auth", oauthRoutes.default);
    app.use("/api/admin", adminRoutes.default);
    app.use("/api/poets", poetRoutes.default);
    app.use("/api/biographies", biographyRoutes.default);
    app.use("/api/poems", poemRoutes.default);
    app.use("/api/poetry", poetryCollectionRoutes.default);
    app.use("/api/contests", contestRoutes.default);
    app.use("/api/learning", learningRoutes.default);
    app.use("/api/search", searchRoutes.default);
    app.use("/api/dashboard", dashboardRoutes.default);
    app.use("/api/rekhta", rekhtaRoutes.default);
    app.use("/api/admin-dashboard", adminDashboardRoutes.default);
    app.use("/api/poet-dashboard", poetDashboardRoutes.default);
    app.use("/api/chat", chatRoutes.default);

    console.log("✅ Routes loaded successfully");
  } catch (error) {
    console.log("❌ Error loading routes:", error.message);
    console.log("⚠️ Server will continue with limited functionality");
  }

  // Error handling middleware (must be after routes)
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

  // 404 handler (must be last)
  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  // Start the server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(
      `📱 Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`
    );
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("🔍 Server started successfully. Try accessing:");
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   API root: http://localhost:${PORT}/api`);
  });
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
