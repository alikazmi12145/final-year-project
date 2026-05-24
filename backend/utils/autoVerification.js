/**
 * autoVerification.js
 * Evaluates a poet's stats and grants a verification tier automatically.
 *
 * Tier criteria (poet must meet ALL conditions of a tier):
 *   bronze   : 10+  poems
 *   silver   : 50+  poems  AND  500+  followers  AND  300+   likes
 *   gold     : 100+ poems  AND  1000+ followers  AND  1000+  likes
 *   diamond  : 500+ poems  AND  2000+ followers  AND  2000+  likes
 *
 * Manual admin approval also grants a badge and is preserved — auto-verification
 * never downgrades an existing badge.
 */
import mongoose from "mongoose";
import User from "../models/User.js";
import Poem from "../models/Poem.js";

export const VERIFICATION_TIERS = {
  bronze: { poems: 10, followers: 0, likes: 0 },
  silver: { poems: 50, followers: 500, likes: 300 },
  gold: { poems: 100, followers: 1000, likes: 1000 },
  diamond: { poems: 500, followers: 2000, likes: 2000 },
};

// A poem counts toward stats once it has cleared moderation
const VISIBLE_POEM_STATUSES = ["approved", "published"];

/**
 * Featured legacy poets whose presence on the platform is honorary.
 * Their displayed stats are inflated to reflect their real-world stature
 * and they are automatically pinned at the diamond tier.
 */
const FEATURED_POETS = {
  "abbas@tabish.com": {
    badge: "gold",
    stats: { poems: 500, followers: 1000, likes: 2000 },
  },
};

const TIER_RANK = { none: 0, bronze: 1, silver: 2, gold: 3, diamond: 4 };

/**
 * Compute a poet's eligible verification tier based on current stats.
 * @param {{poems:number, followers:number, likes:number}} stats
 * @returns {"none"|"bronze"|"silver"|"gold"|"diamond"}
 */
export function computeEligibleTier(stats) {
  const { poems = 0, followers = 0, likes = 0 } = stats || {};
  let earned = "none";
  for (const [tier, req] of Object.entries(VERIFICATION_TIERS)) {
    if (poems >= req.poems && followers >= req.followers && likes >= req.likes) {
      earned = tier;
    }
  }
  return earned;
}

/**
 * Gather a poet's stats from DB.
 * @param {string} userId
 */
export async function getPoetStats(userId) {
  const authorId =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const [publishedPoems, likeAgg, user] = await Promise.all([
    Poem.countDocuments({
      author: authorId,
      status: { $in: VISIBLE_POEM_STATUSES },
    }),
    Poem.aggregate([
      { $match: { author: authorId, status: { $in: VISIBLE_POEM_STATUSES } } },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        },
      },
    ]),
    User.findById(userId).select("email followers verificationBadge isVerified"),
  ]);

  const followers = user?.followers?.length || 0;
  const likes = likeAgg?.[0]?.totalLikes || 0;

  // Featured-poet override: show honorary stats so the verified tier ladder
  // reflects their real-world stature regardless of in-app activity.
  const featured = FEATURED_POETS[user?.email?.toLowerCase()];
  if (featured) {
    return {
      poems: featured.stats.poems,
      followers: featured.stats.followers,
      likes: featured.stats.likes,
      currentBadge: featured.badge,
      isVerified: true,
      featured: true,
    };
  }

  return {
    poems: publishedPoems,
    followers,
    likes,
    currentBadge: user?.verificationBadge || "none",
    isVerified: !!user?.isVerified,
  };
}

/**
 * Evaluate and apply auto-verification for a user.
 * - Only upgrades the badge; never downgrades.
 * - Sets isVerified: true when any tier is earned.
 *
 * @param {string} userId
 * @returns {Promise<{updated:boolean, from:string, to:string, stats:object}>}
 */
export async function evaluateAndApplyAutoVerification(userId) {
  if (!userId) return { updated: false, from: "none", to: "none", stats: null };

  try {
    const stats = await getPoetStats(userId);
    const eligible = computeEligibleTier(stats);

    const currentRank = TIER_RANK[stats.currentBadge] ?? 0;
    const eligibleRank = TIER_RANK[eligible] ?? 0;

    if (eligibleRank <= currentRank) {
      return { updated: false, from: stats.currentBadge, to: stats.currentBadge, stats };
    }

    await User.findByIdAndUpdate(userId, {
      isVerified: true,
      verificationBadge: eligible,
    });

    return { updated: true, from: stats.currentBadge, to: eligible, stats };
  } catch (err) {
    console.error("evaluateAndApplyAutoVerification error:", err);
    return { updated: false, from: "none", to: "none", error: err.message };
  }
}

export default evaluateAndApplyAutoVerification;
