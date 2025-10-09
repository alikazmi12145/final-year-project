import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import User from "../models/User.js";
import connectDB from "../config/database.js";

/**
 * Create a test poet account
 * Email: poet@test.com
 * Password: Poet@123456
 */
const createTestPoet = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected");

    const email = "poet@test.com";
    const password = "Poet@123456";

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("⚠️ User already exists. Updating credentials...");

      // Update the existing user
      const hashedPassword = await bcrypt.hash(password, 12);
      existingUser.password = hashedPassword;
      existingUser.role = "poet";
      existingUser.status = "active";
      existingUser.isApproved = true;
      existingUser.isVerified = true;
      existingUser.emailVerification = {
        isVerified: true,
      };
      await existingUser.save();

      console.log("✅ Test poet account updated successfully!");
    } else {
      console.log("🔧 Creating new test poet account...");

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user
      const newUser = await User.create({
        name: "Test Poet",
        email: email,
        password: hashedPassword,
        role: "poet",
        status: "active",
        isApproved: true,
        isVerified: true,
        emailVerification: {
          isVerified: true,
        },
        bio: "Test poet account for development and testing",
        preferences: {
          language: "urdu",
          theme: "cultural",
          notifications: {
            email: true,
            push: false,
            contests: true,
            newPoetry: true,
          },
        },
        location: {
          city: "Lahore",
          country: "Pakistan",
        },
      });

      console.log("✅ Test poet account created successfully!");
      console.log("📧 Email:", email);
      console.log("🔑 Password:", password);
    }

    console.log("\n📝 Login Credentials:");
    console.log("   Email: poet@test.com");
    console.log("   Password: Poet@123456");
    console.log("\n✅ You can now login with these credentials!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test poet:", error);
    process.exit(1);
  }
};

createTestPoet();
