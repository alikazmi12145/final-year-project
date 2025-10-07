import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import connectDB from "../config/database.js";

dotenv.config();

async function createAdmin() {
  try {
    console.log("🔧 Creating admin user...");
    
    // Connect to database
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("✅ Admin already exists:", existingAdmin.email);
      return process.exit(0);
    }
    
    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || "admin@bazm-e-sukhan.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const admin = await User.create({
      name: "Platform Administrator",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      status: "active",
      isApproved: true,
      isVerified: true,
      emailVerification: {
        isVerified: true
      },
      bio: "System Administrator of Bazm-e-Sukhan platform",
      preferences: {
        language: "urdu",
        theme: "cultural",
        notifications: {
          email: true,
          push: true,
          contests: true,
          newPoetry: true
        }
      }
    });
    
    console.log(`
🎉 Admin user created successfully!

Credentials:
- Email: ${admin.email}
- Password: ${adminPassword}
- Role: ${admin.role}
- Status: ${admin.status}

⚠️  Please change the default password after first login for security.
    `);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin:", error);
    process.exit(1);
  }
}

createAdmin();
