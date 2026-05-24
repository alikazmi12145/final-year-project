/**
 * One-off script: manually verify the poet Abbas Tabish (abbas@tabish.com)
 * and grant him the gold verification badge.
 *
 * Run from project root:
 *   node backend/scripts/verify-abbas-tabish.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const TARGET_EMAIL = "abbas@tabish.com";

await mongoose.connect(process.env.MONGODB_URI);

const User = (await import("../models/User.js")).default;
const VerificationRequest = (await import("../models/VerificationRequest.js")).default;

const user = await User.findOne({ email: TARGET_EMAIL });
if (!user) {
  console.error(`❌ User with email ${TARGET_EMAIL} not found`);
  process.exit(1);
}

user.isVerified = true;
user.verificationBadge = "gold";
if (user.verificationRequest) {
  user.verificationRequest.status = "approved";
  user.verificationRequest.reviewedAt = new Date();
  user.verificationRequest.reviewNotes =
    user.verificationRequest.reviewNotes || "ایڈمن کی طرف سے براہِ راست تصدیق";
}
await user.save();

// Also mark the latest VerificationRequest doc as approved (if any)
const latestReq = await VerificationRequest.findOne({ userId: user._id }).sort({
  createdAt: -1,
});
if (latestReq && latestReq.status !== "approved") {
  latestReq.status = "approved";
  latestReq.adminRemarks =
    latestReq.adminRemarks || "ایڈمن کی طرف سے براہِ راست تصدیق";
  latestReq.reviewedAt = new Date();
  await latestReq.save();
}

console.log("✅ Abbas Tabish verified successfully");
console.log({
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  verificationBadge: user.verificationBadge,
});
process.exit(0);
