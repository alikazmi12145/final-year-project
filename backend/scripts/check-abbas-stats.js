// One-shot diagnostic: show Abbas Tabish stats & poem-status breakdown
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import { getPoetStats } from "../utils/autoVerification.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: "abbas@tabish.com" });
  if (!user) {
    console.log("User not found");
    process.exit(0);
  }
  console.log("User:", {
    id: user._id.toString(),
    name: user.name,
    isVerified: user.isVerified,
    verificationBadge: user.verificationBadge,
    followers: user.followers?.length || 0,
  });

  const byStatus = await Poem.aggregate([
    { $match: { author: user._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  console.log("Poems by status:", byStatus);

  const stats = await getPoetStats(user._id.toString());
  console.log("Computed stats:", stats);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
