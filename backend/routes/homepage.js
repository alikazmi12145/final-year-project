import express from "express";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Get Poet of the Day & Verse of the Day
router.get("/daily-content", async (req, res) => {
  try {
    // Get a random poet with at least one published poem
    const poets = await Poet.find({ status: "active" }).select(
      "name penName profileImage era shortBio"
    );

    if (!poets || poets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No poets found",
      });
    }

    // Select a random poet (deterministic based on day)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0)) /
        1000 /
        60 /
        60 /
        24
    );
    const selectedPoet = poets[dayOfYear % poets.length];

    // Get a random popular poem from this poet
    const poems = await Poem.find({
      poet: selectedPoet._id,
      published: true,
      status: "published",
    })
      .sort({ views: -1, likeCount: -1 })
      .limit(10);

    if (!poems || poems.length === 0) {
      // Try another poet if this one has no poems
      const randomPoet = poets[Math.floor(Math.random() * poets.length)];
      const fallbackPoems = await Poem.find({
        poet: randomPoet._id,
        published: true,
        status: "published",
      }).limit(10);

      if (!fallbackPoems || fallbackPoems.length === 0) {
        // Get any published poem as last resort
        const anyPoem = await Poem.findOne({
          published: true,
          status: "published",
        }).populate("poet", "name penName profileImage era shortBio");

        if (!anyPoem) {
          return res.status(404).json({
            success: false,
            message: "No poems found",
          });
        }

        return res.json({
          success: true,
          data: {
            poet: anyPoem.poet,
            verse: {
              _id: anyPoem._id,
              title: anyPoem.title,
              content: anyPoem.content.split("\n").slice(0, 4).join("\n"),
              category: anyPoem.category,
              mood: anyPoem.mood,
            },
          },
        });
      }

      const selectedVerse =
        fallbackPoems[Math.floor(Math.random() * fallbackPoems.length)];

      return res.json({
        success: true,
        data: {
          poet: randomPoet,
          verse: {
            _id: selectedVerse._id,
            title: selectedVerse.title,
            content: selectedVerse.content.split("\n").slice(0, 4).join("\n"),
            category: selectedVerse.category,
            mood: selectedVerse.mood,
          },
        },
      });
    }

    // Select random poem from top poems
    const selectedVerse = poems[Math.floor(Math.random() * poems.length)];

    res.json({
      success: true,
      data: {
        poet: selectedPoet,
        verse: {
          _id: selectedVerse._id,
          title: selectedVerse.title,
          content: selectedVerse.content.split("\n").slice(0, 4).join("\n"),
          category: selectedVerse.category,
          mood: selectedVerse.mood,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching daily content:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily content",
      error: error.message,
    });
  }
});

// Get Personalized Recommendations (requires authentication)
router.get("/recommendations", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's reading history and preferences
    const user = await User.findById(userId)
      .select("readingHistory bookmarkedPoems following preferences")
      .populate({
        path: "readingHistory.poem",
        select: "category mood theme poet tags",
        populate: { path: "poet", select: "name" },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Extract preferences from user's history
    const categories = new Map();
    const moods = new Map();
    const themes = new Map();
    const poetIds = new Set();

    // Analyze reading history
    user.readingHistory.forEach((entry) => {
      if (entry.poem) {
        if (entry.poem.category) {
          categories.set(
            entry.poem.category,
            (categories.get(entry.poem.category) || 0) + 1
          );
        }
        if (entry.poem.mood) {
          moods.set(entry.poem.mood, (moods.get(entry.poem.mood) || 0) + 1);
        }
        if (entry.poem.theme) {
          themes.set(entry.poem.theme, (themes.get(entry.poem.theme) || 0) + 1);
        }
        if (entry.poem.poet) {
          poetIds.add(entry.poem.poet._id.toString());
        }
      }
    });

    // Get top preferences
    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    const topMoods = Array.from(moods.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    const topThemes = Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    // Build recommendation query
    const query = {
      published: true,
      status: "published",
      $or: [],
    };

    if (topCategories.length > 0) {
      query.$or.push({ category: { $in: topCategories } });
    }
    if (topMoods.length > 0) {
      query.$or.push({ mood: { $in: topMoods } });
    }
    if (topThemes.length > 0) {
      query.$or.push({ theme: { $in: topThemes } });
    }
    if (poetIds.size > 0) {
      query.$or.push({ poet: { $in: Array.from(poetIds) } });
    }

    // If no preferences found, use popular poems
    if (query.$or.length === 0) {
      delete query.$or;
    }

    // Exclude already read poems
    const readPoemIds = user.readingHistory
      .map((entry) => entry.poem?._id)
      .filter(Boolean);
    if (readPoemIds.length > 0) {
      query._id = { $nin: readPoemIds };
    }

    // Fetch recommendations
    const recommendations = await Poem.find(query)
      .populate("poet", "name penName profileImage")
      .select("title content category mood theme views likes poet")
      .sort({ views: -1, averageRating: -1 })
      .limit(12);

    // If not enough recommendations, add some popular poems
    if (recommendations.length < 6) {
      const popularPoems = await Poem.find({
        published: true,
        status: "published",
        _id: { $nin: [...readPoemIds, ...recommendations.map((p) => p._id)] },
      })
        .populate("poet", "name penName profileImage")
        .select("title content category mood theme views likes poet")
        .sort({ views: -1 })
        .limit(12 - recommendations.length);

      recommendations.push(...popularPoems);
    }

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
      error: error.message,
    });
  }
});

// Get Live Community Feed
router.get("/live-feed", async (req, res) => {
  try {
    const activities = [];

    // Get recent poems (last 24 hours)
    const recentPoems = await Poem.find({
      published: true,
      status: "published",
      publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .populate("poet", "name")
      .populate("author", "name")
      .sort({ publishedAt: -1 })
      .limit(5);

    recentPoems.forEach((poem) => {
      const timeDiff = Date.now() - new Date(poem.publishedAt).getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      activities.push({
        _id: `poem-${poem._id}`,
        type: "new_poem",
        message: "نئی شاعری شائع ہوئی",
        user: poem.poet?.name || poem.author?.name || "نامعلوم",
        timeAgo: hoursAgo === 0 ? "ابھی" : `${hoursAgo} گھنٹے پہلے`,
        timestamp: poem.publishedAt,
      });
    });

    // Get recent comments
    const poemsWithRecentComments = await Poem.find({
      "comments.commentedAt": {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })
      .populate("comments.user", "name")
      .sort({ "comments.commentedAt": -1 })
      .limit(5);

    poemsWithRecentComments.forEach((poem) => {
      const recentComment = poem.comments
        .filter(
          (c) =>
            new Date(c.commentedAt).getTime() >
            Date.now() - 24 * 60 * 60 * 1000
        )
        .sort((a, b) => new Date(b.commentedAt) - new Date(a.commentedAt))[0];

      if (recentComment) {
        const timeDiff = Date.now() - new Date(recentComment.commentedAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        activities.push({
          _id: `comment-${recentComment._id}`,
          type: "comment",
          message: "نیا تبصرہ",
          user: recentComment.user?.name || "نامعلوم",
          timeAgo: hoursAgo === 0 ? "ابھی" : `${hoursAgo} گھنٹے پہلے`,
          timestamp: recentComment.commentedAt,
        });
      }
    });

    // Get recent likes
    const poemsWithRecentLikes = await Poem.find({
      "likes.likedAt": { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .populate("likes.user", "name")
      .sort({ "likes.likedAt": -1 })
      .limit(5);

    poemsWithRecentLikes.forEach((poem) => {
      const recentLike = poem.likes
        .filter(
          (l) =>
            new Date(l.likedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        )
        .sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt))[0];

      if (recentLike) {
        const timeDiff = Date.now() - new Date(recentLike.likedAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        activities.push({
          _id: `like-${recentLike._id}`,
          type: "like",
          message: "شاعری پسند کی",
          user: recentLike.user?.name || "نامعلوم",
          timeAgo: hoursAgo === 0 ? "ابھی" : `${hoursAgo} گھنٹے پہلے`,
          timestamp: recentLike.likedAt,
        });
      }
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return top 15 activities
    res.json({
      success: true,
      data: activities.slice(0, 15),
    });
  } catch (error) {
    console.error("Error fetching live feed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch live feed",
      error: error.message,
    });
  }
});

export default router;
