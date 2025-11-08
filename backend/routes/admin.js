import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Contest from "../models/Contest.js";
import Quiz from "../models/Quiz.js";
import News from "../models/News.js";
import LearningResource from "../models/LearningResource.js";
import AdminController from "../controllers/adminController.js";
import { adminAuth, moderatorAuth } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
    const { page = 1, limit = 1000, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // If role is specifically "poet", return ALL poets from Poet collection
    if (role === "poet") {
      const poetQuery = {};
      if (search) {
        poetQuery.$or = [
          { name: { $regex: search, $options: "i" } },
          { penName: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ];
      }

      // Get all poets from Poet collection
      const poets = await Poet.find(poetQuery)
        .populate("user", "email status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Transform poets to match User structure
      const transformedPoets = poets.map(poet => ({
        _id: poet.user?._id || poet._id,
        name: poet.name,
        penName: poet.penName,
        email: poet.user?.email || "N/A",
        role: "poet",
        status: poet.status || poet.user?.status || "active",
        profileImage: poet.profileImage,
        isVerified: poet.isVerified,
        createdAt: poet.createdAt,
        poetId: poet._id,
        isDeceased: poet.isDeceased,
        era: poet.era,
        bio: poet.shortBio || poet.bio,
        stats: poet.stats,
        // Add flag to identify poets without user accounts
        hasUserAccount: !!poet.user,
      }));

      const total = await Poet.countDocuments(poetQuery);

      return res.json({
        success: true,
        users: transformedPoets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    // For non-poet roles or "all" roles, return from User collection
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

    // Get poet info for users who are poets
    const usersWithPoetInfo = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        if (user.role === 'poet') {
          const poetInfo = await Poet.findOne({ user: user._id });
          if (poetInfo) {
            // Merge poet profile image if exists
            userObj.profileImage = poetInfo.profileImage || user.profileImage;
            userObj.penName = poetInfo.penName;
            userObj.poetId = poetInfo._id;
            userObj.hasUserAccount = true;
          }
        }
        
        return userObj;
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users: usersWithPoetInfo,
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
    if (
      user.role === "admin" &&
      user._id.toString() !== req.user._id.toString()
    ) {
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
router.put("/users/:id/approve", adminAuth, [
  body("approvedReason").optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { approvedReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already approved
    if (user.status === "active" && user.isApproved) {
      return res.status(400).json({
        success: false,
        message: "User is already approved",
      });
    }

    // Update user status to active
    user.status = "active";
    user.isApproved = true;
    user.approvedBy = req.user._id; // Use authenticated admin's ID
    user.approvedAt = new Date();
    user.approvedReason = approvedReason;

    // If user is a poet, also update poet profile
    if (user.role === "poet") {
      const poet = await Poet.findOne({ user: user._id });
      if (poet) {
        poet.status = "active";
        poet.approvedBy = req.user._id; // Use authenticated admin's ID
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

router.put("/users/:id/reject", adminAuth, [
  body("rejectedReason")
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason must be between 10 and 500 characters"),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { rejectedBy, rejectedReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already rejected
    if (user.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "User is already rejected",
      });
    }

    // Update user status to rejected
    user.status = "rejected";
    user.isApproved = false;
    user.rejectedBy = rejectedBy || req.user._id;
    user.rejectedAt = new Date();
    user.rejectedReason = rejectedReason;

    // If user is a poet, also update poet profile
    if (user.role === "poet") {
      const poet = await Poet.findOne({ user: user._id });
      if (poet) {
        poet.status = "rejected";
        poet.rejectedBy = rejectedBy || req.user._id;
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

router.put("/users/:id/suspend", adminAuth, [
  body("suspendedReason")
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Suspension reason must be between 10 and 500 characters"),
  body("suspendedUntil")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for suspension end date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Suspension end date must be in the future");
      }
      return true;
    }),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { suspendedBy, suspendedReason, suspendedUntil } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already suspended
    if (user.status === "suspended") {
      return res.status(400).json({
        success: false,
        message: "User is already suspended",
      });
    }

    // Update user status to suspended
    user.status = "suspended";
    user.suspendedBy = suspendedBy || req.user._id;
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
router.put("/users/bulk-approve", adminAuth, [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("User IDs array is required and must contain at least one ID"),
  body("userIds.*")
    .isMongoId()
    .withMessage("Each user ID must be a valid MongoDB ID"),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { userIds } = req.body;

    // Update all users
    const updateResult = await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          status: "active",
          isApproved: true,
          approvedBy: req.user._id,
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
          approvedBy: req.user._id,
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
router.put("/users/bulk", adminAuth, [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("User IDs array is required and must contain at least one ID"),
  body("userIds.*")
    .isMongoId()
    .withMessage("Each user ID must be a valid MongoDB ID"),
  body("updateData")
    .isObject()
    .withMessage("Update data must be an object"),
  body("updateData.status")
    .optional()
    .isIn(["active", "pending", "suspended", "banned", "rejected"])
    .withMessage("Invalid status value"),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { userIds, updateData } = req.body;

    // Add admin metadata
    updateData.updatedBy = req.user._id;
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
      user.verificationRequest.reviewedBy = req.user._id;
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
          poet.verifiedBy = req.user._id;
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

// Poem Management - Get all poems with filtering
router.get("/poems", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const poems = await Poem.find(query)
      .populate("author", "name email")
      .populate("poet", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("title content category status views likes bookmarks createdAt updatedAt");

    const total = await Poem.countDocuments(query);

    res.json({
      success: true,
      poems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get poems error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poems",
    });
  }
});

// Get single poem by ID
router.get("/poems/:id", adminAuth, async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id)
      .populate("author", "name email role")
      .populate("poet", "name bio")
      .populate("moderatedBy", "name email");

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      poem,
    });
  } catch (error) {
    console.error("Get poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poem",
    });
  }
});

// Update poem
router.put("/poems/:id", adminAuth, [
  body("title").optional().trim().isLength({ min: 2, max: 200 }),
  body("content").optional().trim().isLength({ min: 10 }),
  body("category").optional().trim(),
  body("status").optional().isIn(["draft", "pending", "approved", "rejected", "published"]),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const poem = await Poem.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      message: "Poem updated successfully",
      poem,
    });
  } catch (error) {
    console.error("Update poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update poem",
    });
  }
});

// Delete poem
router.delete("/poems/:id", adminAuth, async (req, res) => {
  try {
    const poem = await Poem.findByIdAndDelete(req.params.id);

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      message: "Poem deleted successfully",
    });
  } catch (error) {
    console.error("Delete poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete poem",
    });
  }
});

// Feature/Unfeature poem
router.put("/poems/:id/feature", adminAuth, async (req, res) => {
  try {
    const { featured } = req.body;
    const poem = await Poem.findById(req.params.id);

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    poem.featured = featured;
    poem.featuredAt = featured ? new Date() : null;
    await poem.save();

    res.json({
      success: true,
      message: `Poem ${featured ? "featured" : "unfeatured"} successfully`,
      poem,
    });
  } catch (error) {
    console.error("Feature poem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to feature poem",
    });
  }
});

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
        // Use proper Poem model status values
        content.status = action === "approve" ? "published" : "rejected";
        content.moderatedBy = req.user._id;
        content.moderatedAt = new Date();
        content.moderationNotes = moderationNotes;
        
        // If approving, set published flag and date
        if (action === "approve") {
          content.published = true;
          if (!content.publishedAt) {
            content.publishedAt = new Date();
          }
        }
      } else if (type === "news") {
        content.moderationStatus =
          action === "approve" ? "approved" : "rejected";
        content.moderatedBy = req.user._id;
        content.moderatedAt = new Date();
        content.moderationNotes = moderationNotes;
      }

      await content.save();

      res.json({
        success: true,
        message: `Content ${action}ed successfully`,
        content,
      });
    } catch (error) {
      console.error("Moderate content error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to moderate content",
        error: error.message,
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

// ============= USER APPROVAL ROUTES =============

// Get pending users awaiting approval
router.get("/users/pending", adminAuth, AdminController.getPendingUsers);

// Approve or reject a single user
router.put("/users/:userId/approve", adminAuth, AdminController.approveUser);

// Bulk approve/reject users
router.put("/users/bulk-action", adminAuth, AdminController.bulkApproveUsers);

// ============= CONTEST MANAGEMENT ROUTES =============

// Get all contests (admin view with all details)
router.get("/contests", adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      status, 
      category, 
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Apply filters
    if (status && status !== "all") {
      query.status = status;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { theme: { $regex: search, $options: "i" } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const contests = await Contest.find(query)
      .populate("organizer", "name email")
      .populate("judges", "name")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Contest.countDocuments(query);

    // Add participation and submission counts
    const contestsWithStats = contests.map(contest => ({
      ...contest,
      participantsCount: contest.participants?.length || 0,
      submissionsCount: contest.participants?.filter(p => p.submission).length || 0,
      entries: contest.participants?.length || 0,
      deadline: contest.submissionDeadline,
    }));

    res.json({
      success: true,
      contests: contestsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get contests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contests"
    });
  }
});

// Create new contest (admin)
router.post("/contests", adminAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      theme,
      rules,
      prizes,
      submissionDeadline,
      votingDeadline,
      maxParticipants,
      entryFee,
      language = "urdu",
      judges
    } = req.body;

    const contest = new Contest({
      title,
      description,
      category,
      theme,
      rules,
      prizes,
      submissionDeadline: new Date(submissionDeadline),
      votingDeadline: votingDeadline ? new Date(votingDeadline) : null,
      maxParticipants,
      entryFee: entryFee || 0,
      language,
      organizer: req.user.userId,
      judges: judges || [],
      status: "upcoming"
    });

    await contest.save();
    await contest.populate("organizer", "name");

    res.status(201).json({
      success: true,
      message: "Contest created successfully",
      contest
    });
  } catch (error) {
    console.error("Create contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create contest"
    });
  }
});

// Update contest
router.put("/contests/:id", adminAuth, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("organizer", "name");

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    res.json({
      success: true,
      message: "Contest updated successfully",
      contest
    });
  } catch (error) {
    console.error("Update contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contest"
    });
  }
});

// Delete contest
router.delete("/contests/:id", adminAuth, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Contest not found"
      });
    }

    res.json({
      success: true,
      message: "Contest deleted successfully"
    });
  } catch (error) {
    console.error("Delete contest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contest"
    });
  }
});

// Get single poet details
router.get("/poets/:id", adminAuth, async (req, res) => {
  try {
    const poet = await Poet.findById(req.params.id);
    
    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found"
      });
    }

    res.json({
      success: true,
      poet
    });

  } catch (error) {
    console.error("Get poet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poet details"
    });
  }
});

// Update poet details
router.put("/poets/:id", adminAuth, async (req, res) => {
  try {
    const {
      name,
      penName,
      fullName,
      bio,
      shortBio,
      nationality,
      era,
      schoolOfThought,
      birthPlace,
      period,
      dateOfBirth,
      dateOfDeath,
      isDeceased,
      languages,
      poeticStyle,
      isVerified,
      featured
    } = req.body;

    const updateData = {
      name,
      penName,
      fullName,
      bio,
      shortBio,
      nationality,
      era,
      schoolOfThought,
      birthPlace,
      period,
      dateOfBirth: dateOfBirth || null,
      dateOfDeath: dateOfDeath || null,
      isDeceased: isDeceased === true,
      languages: languages || [],
      poeticStyle: poeticStyle || [],
      isVerified: isVerified === true,
      featured: featured === true
    };

    const poet = await Poet.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found"
      });
    }

    res.json({
      success: true,
      message: "Poet details updated successfully",
      poet
    });

  } catch (error) {
    console.error("Update poet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update poet details"
    });
  }
});

// Upload poet profile image
router.post("/poets/:id/upload-image", adminAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    const poet = await Poet.findById(req.params.id);
    
    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found"
      });
    }

    // Delete old image from cloudinary if exists
    if (poet.profileImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(poet.profileImage.publicId);
      } catch (err) {
        console.error("Error deleting old image:", err);
      }
    }

    // Upload new image to cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'poets',
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Update poet profile image
    poet.profileImage = {
      url: result.secure_url,
      publicId: result.public_id
    };

    await poet.save();

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      profileImage: poet.profileImage,
      poet
    });

  } catch (error) {
    console.error("Upload poet image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image"
    });
  }
});

// Upload general user (admin, moderator, user) profile image
router.post("/users/:id/upload-image", adminAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("Uploading avatar for user:", user._id, "Role:", user.role);

    let avatarUrl;
    let publicId;

    // Check if Cloudinary is properly configured
    const cloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    if (cloudinaryConfigured) {
      try {
        // Delete old image from cloudinary if exists
        if (user.profileImage?.publicId) {
          try {
            await cloudinary.uploader.destroy(user.profileImage.publicId);
            console.log("Deleted old image:", user.profileImage.publicId);
          } catch (err) {
            console.error("Error deleting old image:", err);
          }
        }

        // Upload new image to cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'users',
              public_id: `user_${user._id}`,
              overwrite: true,
              transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto:good' }
              ]
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else {
                console.log("Cloudinary upload success:", result.secure_url);
                resolve(result);
              }
            }
          );
          uploadStream.end(req.file.buffer);
        });

        avatarUrl = result.secure_url;
        publicId = result.public_id;

      } catch (cloudinaryError) {
        console.error("Cloudinary upload failed, falling back to local storage:", cloudinaryError.message);
        // Fallback to local storage
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filename = `user_${user._id}_${Date.now()}${path.extname(req.file.originalname)}`;
        const filepath = path.join(uploadsDir, filename);
        
        await fs.writeFile(filepath, req.file.buffer);
        avatarUrl = `/uploads/profiles/${filename}`;
        publicId = filename;
      }
    } else {
      console.log("Cloudinary not configured, using local storage");
      // Save locally if Cloudinary is not configured
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filename = `user_${user._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const filepath = path.join(uploadsDir, filename);
      
      await fs.writeFile(filepath, req.file.buffer);
      avatarUrl = `/uploads/profiles/${filename}`;
      publicId = filename;
    }

    // Update user profile image
    user.profileImage = {
      url: avatarUrl,
      publicId: publicId
    };

    await user.save();

    console.log("User profile image updated:", user.profileImage);

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      profileImage: user.profileImage,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error("Upload user image error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
