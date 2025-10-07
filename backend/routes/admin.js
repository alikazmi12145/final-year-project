import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Contest from "../models/Contest.js";
import Quiz from "../models/Quiz.js";
import News from "../models/News.js";
import LearningResource from "../models/LearningResource.js";
import { adminAuth, moderatorAuth } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Dashboard Statistics
router.get("/dashboard/stats", adminAuth, async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "poet" }),
      User.countDocuments({ role: "reader" }),
      User.countDocuments({ status: "pending" }),
      Poem.countDocuments(),
      Poem.countDocuments({ published: true }),
      Poem.countDocuments({ status: "under_review" }),
      Contest.countDocuments(),
      Contest.countDocuments({ status: "active" }),
      Quiz.countDocuments(),
      News.countDocuments(),
      LearningResource.countDocuments(),
    ]);

    const [
      totalUsers,
      totalPoets,
      totalReaders,
      pendingApprovals,
      totalPoems,
      publishedPoems,
      poemsUnderReview,
      totalContests,
      activeContests,
      totalQuizzes,
      totalNews,
      totalResources,
    ] = stats;

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role status createdAt");

    const recentPoems = await Poem.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("poet", "name")
      .select("title category status createdAt");

    // Get monthly statistics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyStats = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Poem.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Contest.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const [newUsersThisMonth, newPoemsThisMonth, newContestsThisMonth] =
      monthlyStats;

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          poets: totalPoets,
          readers: totalReaders,
          pending: pendingApprovals,
          newThisMonth: newUsersThisMonth,
        },
        content: {
          poems: {
            total: totalPoems,
            published: publishedPoems,
            underReview: poemsUnderReview,
            newThisMonth: newPoemsThisMonth,
          },
          contests: {
            total: totalContests,
            active: activeContests,
            newThisMonth: newContestsThisMonth,
          },
          quizzes: totalQuizzes,
          news: totalNews,
          resources: totalResources,
        },
        recent: {
          users: recentUsers,
          poems: recentPoems,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
});

// User Management
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (role && role !== "all") query.role = role;
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password -passwordReset -emailVerification")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

router.get("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -passwordReset")
      .populate("bookmarkedPoems", "title category");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get poet info if user is a poet
    let poetInfo = null;
    if (user.role === "poet") {
      poetInfo = await Poet.findOne({ user: user._id });
    }

    // Get user's poems if poet
    let userPoems = [];
    if (user.role === "poet") {
      userPoems = await Poem.find({ author: user._id })
        .sort({ createdAt: -1 })
        .limit(10);
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        poetInfo,
        poems: userPoems,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

router.put(
  "/users/:id",
  adminAuth,
  [
    body("name").optional().isLength({ min: 2, max: 100 }).trim(),
    body("status")
      .optional()
      .isIn(["active", "suspended", "banned", "pending"]),
    body("role").optional().isIn(["reader", "poet", "admin", "moderator"]),
    body("suspensionReason").optional().trim(),
    body("suspendedUntil").optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        status,
        role,
        suspensionReason,
        suspendedUntil,
        ...otherUpdates
      } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update basic fields
      Object.assign(user, otherUpdates);

      // Handle status changes
      if (status !== undefined) {
        user.status = status;

        if (status === "suspended") {
          user.suspensionReason = suspensionReason;
          user.suspendedUntil = suspendedUntil
            ? new Date(suspendedUntil)
            : null;
        } else {
          user.suspensionReason = undefined;
          user.suspendedUntil = undefined;
        }
      }

      // Handle role changes
      if (role !== undefined && role !== user.role) {
        const oldRole = user.role;
        user.role = role;

        // If changing to poet, create poet profile
        if (role === "poet" && oldRole !== "poet") {
          const existingPoet = await Poet.findOne({ user: user._id });
          if (!existingPoet) {
            const poet = new Poet({
              name: user.name,
              bio: user.bio,
              era: "contemporary",
              user: user._id,
              status: "active",
            });
            await poet.save();
          }
        }
      }

      await user.save();

      // Send notification email if status changed
      if (status && status !== user.status) {
        try {
          let subject, message;

          switch (status) {
            case "active":
              subject = "اکاؤنٹ فعال - Account Activated";
              message =
                "Your account has been activated. You can now access all features.";
              break;
            case "suspended":
              subject = "اکاؤنٹ معطل - Account Suspended";
              message = `Your account has been suspended. Reason: ${
                suspensionReason || "No reason provided"
              }`;
              break;
            case "banned":
              subject = "اکاؤنٹ بند - Account Banned";
              message = "Your account has been permanently banned.";
              break;
          }

          if (subject && message) {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: user.email,
              subject,
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d97706;">${subject}</h2>
                <p>${message}</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            `,
            });
          }
        } catch (emailError) {
          console.error("Failed to send notification email:", emailError);
        }
      }

      res.json({
        success: true,
        message: "User updated successfully",
        user: user.toObject(),
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user",
      });
    }
  }
);

router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow deletion of other admins
    if (user.role === "admin" && user._id.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete other admin accounts",
      });
    }

    // Delete associated poet profile if exists
    if (user.role === "poet") {
      await Poet.findOneAndDelete({ user: user._id });
    }

    // Delete user's poems
    await Poem.deleteMany({ author: user._id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User and associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

// User Approval System
router.put("/users/:id/approve", adminAuth, async (req, res) => {
  try {
    const { approvedBy, approvedReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user status to active
    user.status = "active";
    user.isApproved = true;
    user.approvedBy = approvedBy || req.user.userId;
    user.approvedAt = new Date();
    user.approvedReason = approvedReason;

    // If user is a poet, also update poet profile
    if (user.role === "poet") {
      const poet = await Poet.findOne({ user: user._id });
      if (poet) {
        poet.status = "active";
        poet.approvedBy = approvedBy || req.user.userId;
        poet.approvedAt = new Date();
        await poet.save();
      }
    }

    await user.save();

    // Send approval notification email
    try {
      const subject =
        user.role === "poet"
          ? "شاعر اکاؤنٹ منظور - Poet Account Approved"
          : "اکاؤنٹ منظور - Account Approved";

      const message =
        user.role === "poet"
          ? "Congratulations! Your poet account has been approved. You can now access all poet features and publish your poetry."
          : "Congratulations! Your account has been approved. You can now access the platform.";

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 20px; border-radius: 10px;">
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
              <h1 style="color: #059669; margin-bottom: 20px;">🎉 ${subject}</h1>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                ${message}
              </p>
              <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                <p style="color: #166534; margin: 0; font-weight: bold;">Welcome to Bazm-e-Sukhan!</p>
                <p style="color: #166534; margin: 5px 0 0 0;">بازمِ سخن میں خوش آمدید</p>
              </div>
              <a href="${process.env.CLIENT_URL}/login" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
                Login Now / لاگ ان کریں
              </a>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    res.json({
      success: true,
      message: "User approved successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isApproved: user.isApproved,
        approvedAt: user.approvedAt,
      },
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve user",
    });
  }
});

router.put("/users/:id/reject", adminAuth, async (req, res) => {
  try {
    const { rejectedBy, rejectedReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user status to rejected
    user.status = "rejected";
    user.isApproved = false;
    user.rejectedBy = rejectedBy || req.user.userId;
    user.rejectedAt = new Date();
    user.rejectedReason = rejectedReason;

    // If user is a poet, also update poet profile
    if (user.role === "poet") {
      const poet = await Poet.findOne({ user: user._id });
      if (poet) {
        poet.status = "rejected";
        poet.rejectedBy = rejectedBy || req.user.userId;
        poet.rejectedAt = new Date();
        await poet.save();
      }
    }

    await user.save();

    // Send rejection notification email
    try {
      const subject = "درخواست مسترد - Application Rejected";
      const message = `Your ${
        user.role
      } account application has been rejected. ${
        rejectedReason ? `Reason: ${rejectedReason}` : ""
      }`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">${subject}</h2>
            <p>${message}</p>
            <p>If you believe this was a mistake, please contact our support team.</p>
            <p>Best regards,<br>Bazm-e-Sukhan Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    res.json({
      success: true,
      message: "User rejected successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        rejectedAt: user.rejectedAt,
      },
    });
  } catch (error) {
    console.error("Reject user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject user",
    });
  }
});

router.put("/users/:id/suspend", adminAuth, async (req, res) => {
  try {
    const { suspendedBy, suspendedReason, suspendedUntil } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user status to suspended
    user.status = "suspended";
    user.suspendedBy = suspendedBy || req.user.userId;
    user.suspendedAt = new Date();
    user.suspendedReason = suspendedReason;
    user.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null;

    await user.save();

    // Send suspension notification email
    try {
      const subject = "اکاؤنٹ معطل - Account Suspended";
      const message = `Your account has been suspended. ${
        suspendedReason ? `Reason: ${suspendedReason}` : ""
      } ${
        suspendedUntil
          ? `Until: ${new Date(suspendedUntil).toLocaleDateString()}`
          : ""
      }`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">${subject}</h2>
            <p>${message}</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>Bazm-e-Sukhan Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send suspension email:", emailError);
    }

    res.json({
      success: true,
      message: "User suspended successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        suspendedAt: user.suspendedAt,
        suspendedUntil: user.suspendedUntil,
      },
    });
  } catch (error) {
    console.error("Suspend user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend user",
    });
  }
});

// Bulk user approval
router.put("/users/bulk-approve", adminAuth, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    // Update all users
    const updateResult = await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          status: "active",
          isApproved: true,
          approvedBy: req.user.userId,
          approvedAt: new Date(),
        },
      }
    );

    // Also update poet profiles
    await Poet.updateMany(
      { user: { $in: userIds } },
      {
        $set: {
          status: "active",
          approvedBy: req.user.userId,
          approvedAt: new Date(),
        },
      }
    );

    // Get updated users for email notifications
    const users = await User.find({ _id: { $in: userIds } });

    // Send approval emails
    for (const user of users) {
      try {
        const subject =
          user.role === "poet"
            ? "شاعر اکاؤنٹ منظور - Poet Account Approved"
            : "اکاؤنٹ منظور - Account Approved";

        const message =
          user.role === "poet"
            ? "Congratulations! Your poet account has been approved. You can now access all poet features and publish your poetry."
            : "Congratulations! Your account has been approved. You can now access the platform.";

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">🎉 ${subject}</h2>
              <p>${message}</p>
              <a href="${process.env.CLIENT_URL}/login" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Login Now</a>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(
          `Failed to send approval email to ${user.email}:`,
          emailError
        );
      }
    }

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} users approved successfully`,
      modifiedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk approve users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve users",
    });
  }
});

// Get pending users
router.get("/users/pending", adminAuth, async (req, res) => {
  try {
    const { role } = req.query;

    const query = { status: "pending" };
    if (role && role !== "all") {
      query.role = role;
    }

    const pendingUsers = await User.find(query)
      .select("-password -passwordReset -emailVerification")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users: pendingUsers,
      count: pendingUsers.length,
    });
  } catch (error) {
    console.error("Get pending users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending users",
    });
  }
});

// Bulk user operations
router.put("/users/bulk", adminAuth, async (req, res) => {
  try {
    const { userIds, updateData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    // Add admin metadata
    updateData.updatedBy = req.user.userId;
    updateData.updatedAt = new Date();

    const updateResult = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} users updated successfully`,
      modifiedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk update users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update users",
    });
  }
});

// Poet Verification Management
router.get("/poets/pending", adminAuth, async (req, res) => {
  try {
    const pendingPoets = await User.find({
      role: "poet",
      "verificationRequest.status": "pending",
    }).populate({
      path: "verificationRequest.reviewedBy",
      select: "name email",
    });

    res.json({
      success: true,
      poets: pendingPoets,
    });
  } catch (error) {
    console.error("Get pending poets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending poets",
    });
  }
});

router.put(
  "/poets/:id/verify",
  adminAuth,
  [
    body("action").isIn(["approve", "reject"]),
    body("reviewNotes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const { action, reviewNotes } = req.body;
      const user = await User.findById(req.params.id);

      if (!user || user.role !== "poet") {
        return res.status(404).json({
          success: false,
          message: "Poet not found",
        });
      }

      // Update verification status
      user.verificationRequest.status =
        action === "approve" ? "approved" : "rejected";
      user.verificationRequest.reviewedBy = req.user.userId;
      user.verificationRequest.reviewedAt = new Date();
      user.verificationRequest.reviewNotes = reviewNotes;

      if (action === "approve") {
        user.isVerified = true;
        user.status = "active";
        user.verificationBadge = "bronze"; // Default verification badge

        // Update poet profile
        const poet = await Poet.findOne({ user: user._id });
        if (poet) {
          poet.isVerified = true;
          poet.verifiedBy = req.user.userId;
          poet.verifiedAt = new Date();
          poet.status = "active";
          await poet.save();
        }
      }

      await user.save();

      // Send notification email
      try {
        const subject =
          action === "approve"
            ? "شاعر کی تصدیق مکمل - Poet Verification Approved"
            : "شاعر کی تصدیق مسترد - Poet Verification Rejected";

        const message =
          action === "approve"
            ? "Congratulations! Your poet verification has been approved. You can now access all poet features."
            : `Your poet verification has been rejected. ${
                reviewNotes ? `Reason: ${reviewNotes}` : ""
              }`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${
              action === "approve" ? "#059669" : "#dc2626"
            };">${subject}</h2>
            <p>${message}</p>
            <p>Best regards,<br>Bazm-e-Sukhan Team</p>
          </div>
        `,
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      res.json({
        success: true,
        message: `Poet ${
          action === "approve" ? "approved" : "rejected"
        } successfully`,
      });
    } catch (error) {
      console.error("Verify poet error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process poet verification",
      });
    }
  }
);

// Content Moderation
router.get("/content/flagged", moderatorAuth, async (req, res) => {
  try {
    const { type = "all" } = req.query;

    let flaggedContent = [];

    if (type === "all" || type === "poems") {
      const flaggedPoems = await Poem.find({
        status: "flagged",
      })
        .populate("author", "name email")
        .populate("poet", "name");

      flaggedContent = flaggedContent.concat(
        flaggedPoems.map((poem) => ({
          ...poem.toObject(),
          contentType: "poem",
        }))
      );
    }

    if (type === "all" || type === "news") {
      const flaggedNews = await News.find({
        moderationStatus: "flagged",
      }).populate("author", "name email");

      flaggedContent = flaggedContent.concat(
        flaggedNews.map((news) => ({ ...news.toObject(), contentType: "news" }))
      );
    }

    res.json({
      success: true,
      content: flaggedContent,
    });
  } catch (error) {
    console.error("Get flagged content error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flagged content",
    });
  }
});

router.put(
  "/content/:type/:id/moderate",
  moderatorAuth,
  [
    body("action").isIn(["approve", "reject", "edit"]),
    body("moderationNotes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const { type, id } = req.params;
      const { action, moderationNotes } = req.body;

      let Model;
      switch (type) {
        case "poem":
          Model = Poem;
          break;
        case "news":
          Model = News;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid content type",
          });
      }

      const content = await Model.findById(id);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      // Update moderation status
      if (type === "poem") {
        content.status = action === "approve" ? "approved" : "rejected";
        content.moderatedBy = req.user.userId;
        content.moderatedAt = new Date();
        content.moderationNotes = moderationNotes;
      } else if (type === "news") {
        content.moderationStatus =
          action === "approve" ? "approved" : "rejected";
        content.moderatedBy = req.user.userId;
        content.moderatedAt = new Date();
        content.moderationNotes = moderationNotes;
      }

      await content.save();

      res.json({
        success: true,
        message: `Content ${action}ed successfully`,
      });
    } catch (error) {
      console.error("Moderate content error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to moderate content",
      });
    }
  }
);

// System Settings
router.get("/settings", adminAuth, async (req, res) => {
  try {
    // Return system settings (could be stored in database or config)
    const settings = {
      registration: {
        allowPoetRegistration: true,
        requireEmailVerification: true,
        requireAdminApproval: true,
      },
      content: {
        autoModeration: false,
        allowAnonymousPoems: false,
        requireContentApproval: true,
      },
      features: {
        contestsEnabled: true,
        quizzesEnabled: true,
        learningResourcesEnabled: true,
        chatEnabled: true,
      },
    };

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
    });
  }
});

// Analytics
router.get("/analytics", adminAuth, async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Calculate date range
    let startDate;
    switch (period) {
      case "7d":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user registration trends
    const userTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get content creation trends
    const contentTrends = await Poem.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        userTrends,
        contentTrends,
        period,
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
});

export default router;
