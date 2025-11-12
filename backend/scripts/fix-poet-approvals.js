import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

// Load environment variables
dotenv.config();

/**
 * Script to check and fix poet approval status
 * This ensures all poets require admin approval
 */
async function fixPoetApprovals() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all poet users
    const poets = await User.find({ role: "poet" });
    console.log(`\n📊 Found ${poets.length} poet accounts\n`);

    // Check each poet's status
    let needsFixCount = 0;
    for (const poet of poets) {
      console.log(`\nPoet: ${poet.email}`);
      console.log(`  Status: ${poet.status}`);
      console.log(`  Approved: ${poet.isApproved}`);
      console.log(`  Created: ${poet.createdAt}`);

      // Check if poet is inappropriately approved
      if (poet.status === "active" && poet.isApproved) {
        console.log(`  ✅ This poet is properly approved`);
      } else if (poet.status === "active" && !poet.isApproved) {
        console.log(`  ⚠️  WARNING: Status is active but isApproved is false`);
        console.log(`  → This account should be set to pending`);
        needsFixCount++;
      } else if (poet.status === "pending") {
        console.log(`  ⏳ This poet is waiting for approval (correct state)`);
      }
    }

    console.log(`\n\n📋 Summary:`);
    console.log(`  Total poets: ${poets.length}`);
    console.log(`  Need fixing: ${needsFixCount}`);

    // Ask if user wants to fix
    if (needsFixCount > 0) {
      console.log(`\n⚠️  Found ${needsFixCount} poet(s) with inconsistent approval status.`);
      console.log(`To fix these accounts, run this script with --fix flag:`);
      console.log(`  node scripts/fix-poet-approvals.js --fix`);
    } else {
      console.log(`\n✅ All poet accounts have consistent approval status!`);
    }

    // If --fix flag is provided, actually fix the accounts
    if (process.argv.includes("--fix")) {
      console.log(`\n🔧 Fixing inconsistent poet accounts...`);

      const result = await User.updateMany(
        {
          role: "poet",
          status: "active",
          isApproved: false,
        },
        {
          $set: {
            status: "pending",
            isApproved: false,
          },
        }
      );

      console.log(`✅ Fixed ${result.modifiedCount} poet account(s)`);
      console.log(`These poets will now need admin approval to access their dashboard.`);
    }

    // Disconnect
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
fixPoetApprovals();
