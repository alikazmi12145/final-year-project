import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Chat from "../models/Chat.js";
import { Message } from "../models/Message.js";
import User from "../models/User.js"; // Need to import User model for populate to work

const cleanupDuplicateConversations = async () => {
  try {
    console.log("🚀 Starting duplicate conversation cleanup...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all direct conversations
    const allConversations = await Chat.find({ chatType: "direct" })
      .populate("participants.user", "name")
      .lean();

    console.log(`📊 Total direct conversations: ${allConversations.length}`);

    // Group conversations by participant pairs
    const conversationGroups = new Map();

    allConversations.forEach((conv) => {
      if (conv.participants.length !== 2) return;
      
      // Skip if any participant has null user
      if (!conv.participants[0].user || !conv.participants[1].user) {
        console.log(`⚠️ Skipping conversation ${conv._id} - has null participant`);
        return;
      }

      // Create a unique key for this pair of users
      const userIds = conv.participants
        .map((p) => p.user._id.toString())
        .sort();
      const pairKey = userIds.join("-");

      if (!conversationGroups.has(pairKey)) {
        conversationGroups.set(pairKey, []);
      }
      conversationGroups.get(pairKey).push(conv);
    });

    console.log(`👥 Unique user pairs: ${conversationGroups.size}`);

    // Find and merge duplicates
    let duplicatesFound = 0;
    let conversationsDeleted = 0;
    let messagesMoved = 0;

    for (const [pairKey, conversations] of conversationGroups.entries()) {
      if (conversations.length > 1) {
        duplicatesFound++;
        const userNames = conversations[0].participants
          .map((p) => p.user.name)
          .join(" & ");

        console.log(`\n🔍 Found ${conversations.length} conversations for: ${userNames}`);
        console.log(`   Pair key: ${pairKey}`);

        // Sort by creation date to keep the oldest one
        conversations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const keepConversation = conversations[0];
        const duplicates = conversations.slice(1);

        console.log(`   ✅ Keeping: ${keepConversation._id} (created: ${keepConversation.createdAt})`);

        // Move all messages from duplicates to the main conversation
        for (const duplicate of duplicates) {
          console.log(`   🔄 Processing duplicate: ${duplicate._id}`);

          // Update messages to point to the main conversation
          const updateResult = await Message.updateMany(
            { conversation: duplicate._id },
            { $set: { conversation: keepConversation._id } }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(`      Moved ${updateResult.modifiedCount} messages`);
            messagesMoved += updateResult.modifiedCount;
          }

          // Delete the duplicate conversation
          await Chat.deleteOne({ _id: duplicate._id });
          conversationsDeleted++;
          console.log(`      ❌ Deleted duplicate conversation`);
        }

        // Update the kept conversation's lastActivity
        const latestMessage = await Message.findOne({
          conversation: keepConversation._id,
        })
          .sort({ createdAt: -1 })
          .lean();

        if (latestMessage) {
          await Chat.updateOne(
            { _id: keepConversation._id },
            {
              $set: {
                lastMessage: latestMessage._id,
                lastActivity: latestMessage.createdAt,
              },
            }
          );
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Cleanup Summary:");
    console.log(`   Total conversations: ${allConversations.length}`);
    console.log(`   Duplicate groups found: ${duplicatesFound}`);
    console.log(`   Conversations deleted: ${conversationsDeleted}`);
    console.log(`   Messages moved: ${messagesMoved}`);
    console.log("=".repeat(50));

    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
};

// Run the cleanup
cleanupDuplicateConversations();
