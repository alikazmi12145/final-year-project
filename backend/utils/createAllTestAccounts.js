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
 * Create test accounts for all roles
 */
const testAccounts = [
  {
    name: "Admin User",
    email: "admin@test.com",
    password: "Admin@123456",
    role: "admin",
    bio: "Test admin account",
  },
  {
    name: "Test Poet",
    email: "poet@test.com",
    password: "Poet@123456",
    role: "poet",
    bio: "Test poet account",
  },
  {
    name: "Test Moderator",
    email: "moderator@test.com",
    password: "Mod@123456",
    role: "moderator",
    bio: "Test moderator account",
  },
  {
    name: "Test Reader",
    email: "reader@test.com",
    password: "Reader@123456",
    role: "reader",
    bio: "Test reader account",
  },
];

const createAllTestAccounts = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected\n");

    for (const account of testAccounts) {
      const { name, email, password, role, bio } = account;

      // Check if user already exists
      let user = await User.findOne({ email });

      if (user) {
        console.log(`⚠️ ${role.toUpperCase()} account exists. Updating...`);

        // Update the existing user
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.name = name;
        user.role = role;
        user.status = "active";
        user.isApproved = true;
        user.isVerified = true;
        user.emailVerification = {
          isVerified: true,
        };
        user.bio = bio;
        await user.save();

        console.log(`✅ ${role.toUpperCase()} account updated!`);
      } else {
        console.log(`🔧 Creating ${role.toUpperCase()} account...`);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        user = await User.create({
          name: name,
          email: email,
          password: hashedPassword,
          role: role,
          status: "active",
          isApproved: true,
          isVerified: true,
          emailVerification: {
            isVerified: true,
          },
          bio: bio,
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

        console.log(`✅ ${role.toUpperCase()} account created!`);
      }

      console.log(`   📧 Email: ${email}`);
      console.log(`   🔑 Password: ${password}\n`);
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ ALL TEST ACCOUNTS READY!");
    console.log("═══════════════════════════════════════");
    console.log("\n📝 Login Credentials Summary:\n");
    testAccounts.forEach((account) => {
      console.log(`${account.role.toUpperCase()}:`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: ${account.password}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test accounts:", error);
    process.exit(1);
  }
};

createAllTestAccounts();
