import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User.js";
import "dotenv/config";

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create test admin user
    const adminEmail = "admin@test.com";
    const adminPassword = "Admin@123456";

    // Check if admin exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`👤 Admin user exists: ${adminEmail}`);
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      admin.password = hashedPassword;
      admin.role = "admin";
      admin.status = "active";
      admin.isApproved = true;
      admin.isVerified = true;
      await admin.save();
      console.log(`🔄 Admin password updated for: ${adminEmail}`);
    } else {
      console.log(`🔧 Creating admin user: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      admin = new User({
        name: "Test Administrator",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        status: "active",
        isApproved: true,
        isVerified: true,
        emailVerification: {
          isVerified: true,
          verifiedAt: new Date(),
        },
        bio: "Test Administrator Account",
        preferences: {
          language: "urdu",
          theme: "cultural",
          notifications: {
            email: true,
            push: true,
            contests: true,
            newPoetry: true,
          },
        },
      });

      await admin.save();
      console.log(`✅ Admin user created: ${adminEmail}`);
    }

    // Create test regular user
    const userEmail = "testuser@example.com";
    const userPassword = "testpassword123";

    let user = await User.findOne({ email: userEmail });

    if (user) {
      console.log(`👤 Test user exists: ${userEmail}`);
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(userPassword, 12);
      user.password = hashedPassword;
      user.role = "reader";
      user.status = "active";
      user.isApproved = true;
      user.isVerified = true;
      await user.save();
      console.log(`🔄 Test user password updated for: ${userEmail}`);
    } else {
      console.log(`🔧 Creating test user: ${userEmail}`);
      const hashedPassword = await bcrypt.hash(userPassword, 12);

      user = new User({
        name: "Test User",
        email: userEmail,
        password: hashedPassword,
        role: "reader",
        status: "active",
        isApproved: true,
        isVerified: true,
        emailVerification: {
          isVerified: true,
          verifiedAt: new Date(),
        },
        bio: "Test Reader Account",
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
      });

      await user.save();
      console.log(`✅ Test user created: ${userEmail}`);
    }

    console.log("\n🎉 Test users ready:");
    console.log(`📧 Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`📧 User: ${userEmail} / ${userPassword}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test users:", error);
    process.exit(1);
  }
}

createTestUsers();
