import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// ==============================================
// Post Controller - CRUD + Like/Report for News Feed
// ==============================================

// ── CREATE POST (Admin Only) ──
export const createPost = async (req, res) => {
  try {
    const { title, description, category, image } = req.body;

    const post = await Post.create({
      title,
      description,
      category,
      image: image || {},
      createdBy: req.user.userId,
    });

    // Populate author info for the response
    await post.populate("createdBy", "name profileImage");

    // Send real-time notification to all users via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("new_post", {
        postId: post._id,
        title: post.title,
        category: post.category,
      });

      // Create persistent notifications for all active users
      const users = await User.find(
        { status: "active", _id: { $ne: req.user.userId } },
        "_id"
      ).lean();

      if (users.length > 0) {
        const notifications = users.map((u) => ({
          userId: u._id,
          message: `نئی پوسٹ: "${title}"`,
          type: "post",
          relatedId: post._id,
          relatedModel: "Post",
        }));
        await Notification.insertMany(notifications);

        // Emit to each user's personal room
        users.forEach((u) => {
          io.to(u._id.toString()).emit("notification", {
            message: `نئی پوسٹ: "${title}"`,
            type: "post",
            postId: post._id,
          });
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "پوسٹ کامیابی سے شائع ہو گئی",
      data: post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "پوسٹ بنانے میں خرابی",
      error: error.message,
    });
  }
};

// ── GET ALL POSTS (Public - with pagination, filter, search) ──
export const getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      status = "published",
    } = req.query;

    const query = { status };

    // Filter by category
    if (category && ["event", "poetry", "contest"].includes(category)) {
      query.category = category;
    }

    // Full-text search on title + description
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .populate("createdBy", "name profileImage role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add like count and whether current user liked each post
    const userId = req.user?.userId;
    const postsWithMeta = posts.map((post) => ({
      ...post,
      likesCount: post.likes?.length || 0,
      isLiked: userId
        ? post.likes?.some((l) => l.user?.toString() === userId)
        : false,
      reportsCount: post.reports?.length || 0,
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: postsWithMeta,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "پوسٹس لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── GET SINGLE POST ──
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("createdBy", "name profileImage role")
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "پوسٹ نہیں ملی",
      });
    }

    const userId = req.user?.userId;
    post.likesCount = post.likes?.length || 0;
    post.isLiked = userId
      ? post.likes?.some((l) => l.user?.toString() === userId)
      : false;

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "پوسٹ لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── UPDATE POST (Admin Only) ──
export const updatePost = async (req, res) => {
  try {
    const { title, description, category, image, status } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "پوسٹ نہیں ملی",
      });
    }

    // Update only provided fields
    if (title) post.title = title;
    if (description) post.description = description;
    if (category) post.category = category;
    if (image) post.image = image;
    if (status) post.status = status;

    await post.save();
    await post.populate("createdBy", "name profileImage");

    res.json({
      success: true,
      message: "پوسٹ کامیابی سے اپ ڈیٹ ہو گئی",
      data: post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "پوسٹ اپ ڈیٹ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── DELETE POST (Admin Only) ──
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "پوسٹ نہیں ملی",
      });
    }

    res.json({
      success: true,
      message: "پوسٹ کامیابی سے حذف ہو گئی",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "پوسٹ حذف کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── LIKE / UNLIKE POST ──
export const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "پوسٹ نہیں ملی",
      });
    }

    const userId = req.user.userId;
    const existingLike = post.likes.find(
      (l) => l.user.toString() === userId
    );

    if (existingLike) {
      // Unlike - remove the like
      post.likes = post.likes.filter(
        (l) => l.user.toString() !== userId
      );
    } else {
      // Like - add new like
      post.likes.push({ user: userId });
    }

    await post.save();

    res.json({
      success: true,
      message: existingLike ? "لائک ہٹا دیا گیا" : "لائک کر دیا گیا",
      data: {
        likesCount: post.likes.length,
        isLiked: !existingLike,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "لائک کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── REPORT POST ──
export const reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "رپورٹ کی وجہ ضروری ہے",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "پوسٹ نہیں ملی",
      });
    }

    // Check if user already reported this post
    const alreadyReported = post.reports.some(
      (r) => r.user.toString() === req.user.userId
    );
    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "آپ پہلے ہی اس پوسٹ کی رپورٹ کر چکے ہیں",
      });
    }

    post.reports.push({
      user: req.user.userId,
      reason: reason.trim(),
    });

    // Auto-flag if 3+ reports
    if (post.reports.filter((r) => r.status === "pending").length >= 3) {
      post.status = "flagged";
    }

    await post.save();

    res.json({
      success: true,
      message: "رپورٹ کامیابی سے جمع ہو گئی",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رپورٹ جمع کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── GET REPORTED POSTS (Admin Only) ──
export const getReportedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { "reports.status": "pending", "reports.0": { $exists: true } };
    const total = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .populate("createdBy", "name profileImage")
      .populate("reports.user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رپورٹ شدہ پوسٹس لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── MODERATE REPORT (Admin - Approve/Reject) ──
export const moderateReport = async (req, res) => {
  try {
    const { postId, reportId } = req.params;
    const { action } = req.body; // "approved" or "rejected"

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "غلط کارروائی - approved یا rejected ہونا چاہیے",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "پوسٹ نہیں ملی" });
    }

    const report = post.reports.id(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: "رپورٹ نہیں ملی" });
    }

    report.status = action;

    // If report is approved, archive the post
    if (action === "approved") {
      post.status = "archived";
    }

    // If report is rejected and no more pending reports, restore post
    if (action === "rejected") {
      const pendingReports = post.reports.filter(
        (r) => r.status === "pending" && r._id.toString() !== reportId
      );
      if (pendingReports.length === 0) {
        post.status = "published";
      }
    }

    await post.save();

    res.json({
      success: true,
      message:
        action === "approved"
          ? "رپورٹ منظور - پوسٹ آرکائیو ہو گئی"
          : "رپورٹ مسترد ہو گئی",
      data: post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رپورٹ کی کارروائی میں خرابی",
      error: error.message,
    });
  }
};
