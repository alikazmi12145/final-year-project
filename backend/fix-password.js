import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User.js";
import "dotenv/config";

async function fixUserPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const email = "admin@test.com";
    const newPassword = "Admin@123456";

    // Find the user
    const user = await User.findOne({ email: email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);
    console.log(`🔍 Current role: ${user.role}`);
    console.log(`🔍 Current status: ${user.status}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user
    user.password = hashedPassword;
    user.role = "admin";
    user.status = "active";
    user.isApproved = true;
    user.isVerified = true;

    if (!user.emailVerification) {
      user.emailVerification = {};
    }
    user.emailVerification.isVerified = true;

    await user.save();

    console.log(`✅ Password updated for: ${email}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`✅ User set as admin and activated`);

    // Test the password
    const isValid = await bcrypt.compare(newPassword, user.password);
    console.log(
      `🧪 Password verification test: ${isValid ? "✅ PASS" : "❌ FAIL"}`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixUserPassword();
