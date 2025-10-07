import express from "express";
import { auth } from "../middleware/auth.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import Contest from "../models/Contest.js";

const router = express.Router();

// Get poet dashboard data
router.get("/poet", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get poet's poems
    const poems = await Poem.find({
      author: userId,
      status: { $ne: "deleted" },
    })
      .populate("author", "name")
      .sort({ createdAt: -1 });

    // Separate published, pending, and drafts
    const publishedPoems = poems.filter((poem) => poem.status === "published");
    const pendingPoems = poems.filter((poem) => poem.status === "pending");
    const drafts = poems.filter((poem) => poem.status === "draft");
    const rejectedPoems = poems.filter((poem) => poem.status === "rejected");

    // Calculate analytics
    const totalViews = poems.reduce(
      (sum, poem) => sum + (poem.viewsCount || 0),
      0
    );
    const totalLikes = poems.reduce(
      (sum, poem) => sum + (poem.likesCount || 0),
      0
    );
    const totalComments = poems.reduce(
      (sum, poem) => sum + (poem.commentsCount || 0),
      0
    );

    // Get contests (mock data for now)
    const contests = [
      {
        id: "1",
        title: "Spring Poetry Contest 2024",
        deadline: "2024-02-15T23:59:59Z",
        status: "active",
        participants: 45,
      },
      {
        id: "2",
        title: "Love & Romance Poetry",
        deadline: "2024-03-01T23:59:59Z",
        status: "upcoming",
        participants: 12,
      },
    ];

    // Get submissions (mock data for now)
    const submissions = [
      {
        id: "5",
        title: "دل کی بات",
        contest: "Spring Poetry 2024",
        status: "under_review",
        submittedAt: "2024-01-22T11:20:00Z",
      },
    ];

    const analytics = {
      totalViews,
      totalLikes,
      totalComments,
      totalPoems: poems.length, // Include all poems (published + pending + rejected)
      publishedPoems: publishedPoems.length,
      pendingPoems: pendingPoems.length,
      rejectedPoems: rejectedPoems.length,
      totalDrafts: drafts.length,
      followers: 45, // Mock data - implement follower system later
      engagementRate:
        totalViews > 0
          ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(1)
          : 0,
      monthlyGrowth: 12, // Mock data
    };

    res.json({
      success: true,
      data: {
        poems: publishedPoems,
        pendingPoems,
        rejectedPoems,
        drafts,
        contests,
        submissions,
        analytics,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
});

// Get admin dashboard data
router.get("/admin", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    // Get overall statistics
    const [totalUsers, totalPoems, totalActivePoets, pendingApprovals] =
      await Promise.all([
        User.countDocuments(),
        Poem.countDocuments({ status: { $ne: "deleted" } }),
        User.countDocuments({ role: "poet", isActive: true }),
        Poem.countDocuments({ status: "pending" }),
      ]);

    // Get recent poems for moderation
    const recentPoems = await Poem.find({ status: "pending" })
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email role isActive createdAt");

    // Get poems by category for analytics
    const poemsByCategory = await Poem.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly growth data (mock for now)
    const monthlyGrowth = [
      { month: "Jan", users: 45, poems: 120 },
      { month: "Feb", users: 52, poems: 135 },
      { month: "Mar", users: 61, poems: 158 },
      { month: "Apr", users: 68, poems: 172 },
      { month: "May", users: 74, poems: 189 },
      { month: "Jun", users: 82, poems: 205 },
    ];

    const analytics = {
      totalUsers,
      totalPoems,
      totalActivePoets,
      pendingApprovals,
      poemsByCategory,
      monthlyGrowth,
      engagementRate: 8.4, // Mock data
      contentQualityScore: 92, // Mock data
    };

    res.json({
      success: true,
      data: {
        analytics,
        recentPoems,
        recentUsers,
        systemHealth: {
          status: "good",
          uptime: "99.9%",
          responseTime: "245ms",
          errorRate: "0.1%",
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard data",
    });
  }
});

// Approve poem
router.patch("/admin/poems/:id/approve", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const poem = await Poem.findByIdAndUpdate(
      req.params.id,
      {
        status: "published",
        published: true,
        publishedAt: new Date(),
        moderatedBy: req.user.userId,
        moderatedAt: new Date(),
      },
      { new: true }
    );

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      message: "Poem approved successfully",
      poem,
    });
  } catch (error) {
    console.error("Approve poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve poem",
    });
  }
});

// Reject poem
router.patch("/admin/poems/:id/reject", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { reason } = req.body;

    const poem = await Poem.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectionReason: reason,
        moderatedBy: req.user.userId,
        moderatedAt: new Date(),
      },
      { new: true }
    );

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      message: "Poem rejected successfully",
      poem,
    });
  } catch (error) {
    console.error("Reject poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject poem",
    });
  }
});

// Toggle user status
router.patch("/admin/users/:id/toggle-status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${
        user.isActive ? "activated" : "deactivated"
      } successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
});

export default router;
