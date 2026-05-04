import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config();

// Force Node.js c-ares to use reliable DNS servers (fixes ESERVFAIL for Atlas SRV records)
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const LOCAL_URI = "mongodb://127.0.0.1:27017/bazm-e-sukhan";

const connectDB = async () => {
  const mongoOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  };

  // Try Atlas URI first (if set), then fall back to local MongoDB
  const atlasURI = process.env.MONGODB_URI && process.env.MONGODB_URI !== LOCAL_URI
    ? process.env.MONGODB_URI
    : null;

  if (atlasURI) {
    try {
      const conn = await mongoose.connect(atlasURI, mongoOptions);
      console.log(`✅ MongoDB Connected (Atlas): ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️  Atlas connection failed: ${error.message}`);
      console.log("🔄 Falling back to local MongoDB...");
    }
  }

  // Fallback: local MongoDB
  try {
    const conn = await mongoose.connect(LOCAL_URI, mongoOptions);
    console.log(`✅ MongoDB Connected (Local): ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

// Handle MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("📊 MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB connection disconnected");
});

export default connectDB;
