import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bazm-e-sukhan",
      {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      }
    );

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log(
      "⚠️  Server will continue without database connection for testing"
    );
    // Don't exit the process, just log the error
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
