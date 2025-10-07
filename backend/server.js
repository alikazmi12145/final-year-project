import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "passport";
import connectDB from "./config/database.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
// import oauthRoutes from "./routes/oauth.js"; // Temporarily commented out
import poemRoutes from "./routes/poems.js";
import poetRoutes from "./routes/poets.js";
import searchRoutes from "./routes/search.js";
import learningRoutes from "./routes/learning.js";
import contestRoutes from "./routes/contests.js";
import dashboardRoutes from "./routes/dashboard.js";
import poetryCollectionRoutes from "./routes/poetryCollection.js";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
// app.use(helmet()); // Temporarily disabled

// Rate limiting - temporarily disabled
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later."
// });
// app.use(limiter);

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

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Passport
app.use(passport.initialize());

// ✅ API Routes
app.use("/api/auth", authRoutes);
// app.use("/api/auth", oauthRoutes); // OAuth routes under /api/auth - temporarily commented out
app.use("/api/poems", poemRoutes);
app.use("/api/poets", poetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/poetry", poetryCollectionRoutes);

// Optional: simple root welcome (can help quick sanity check)
app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "Bazm-e-Sukhan API root",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ✅ Start server with MongoDB connection
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(
        `📱 Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`
      );
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

      // Simple connectivity test
      console.log("🔍 Server started successfully. Try accessing:");
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log(`   Login endpoint: http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
