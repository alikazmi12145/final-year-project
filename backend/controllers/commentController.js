import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// ==============================================
// Comment Controller - CRUD + Like/Report for Post Comments
// ==============================================

// ── ADD COMMENT TO A POST ──
export const addComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const postId = req.params.postId;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "پوسٹ نہیں ملی",
      });
    }

    // If replying to a comment, verify parent exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.post.toString() !== postId) {
        return res.status(404).json({
          success: false,
          message: "پیرنٹ تبصرہ نہیں ملا",
        });
      }

      // Notify the parent comment author about the reply
      if (parent.user.toString() !== req.user.userId) {
        const commenter = await User.findById(req.user.userId, "name").lean();
        const notification = await Notification.create({
          userId: parent.user,
          message: `${commenter?.name || "کسی"} نے آپ کے تبصرے کا جواب دیا`,
          type: "comment",
          relatedId: parent._id,
          relatedModel: "Comment",
        });

        // Real-time notification
        const io = req.app.get("io");
        if (io) {
          io.to(parent.user.toString()).emit("notification", {
            message: notification.message,
            type: "comment",
            commentId: parent._id,
            postId,
          });
        }
      }
    }

    const comment = await Comment.create({
      post: postId,
      user: req.user.userId,
      content,
      parentComment: parentComment || null,
    });

    await comment.populate("user", "name profileImage");

    res.status(201).json({
      success: true,
      message: "تبصرہ کامیابی سے شائع ہو گیا",
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "تبصرہ شائع کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── GET COMMENTS FOR A POST (with pagination) ──
export const getComments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const postId = req.params.postId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get top-level comments only (not replies)
    const query = { post: postId, parentComment: null, status: "active" };
    const total = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate("user", "name profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Fetch replies for each comment
    const commentIds = comments.map((c) => c._id);
    const replies = await Comment.find({
      parentComment: { $in: commentIds },
      status: "active",
    })
      .populate("user", "name profileImage")
      .sort({ createdAt: 1 })
      .lean();

    // Map replies to their parent comments
    const userId = req.user?.userId;
    const commentsWithReplies = comments.map((comment) => ({
      ...comment,
      likesCount: comment.likes?.length || 0,
      isLiked: userId
        ? comment.likes?.some((l) => l.user?.toString() === userId)
        : false,
      replies: replies
        .filter((r) => r.parentComment?.toString() === comment._id.toString())
        .map((r) => ({
          ...r,
          likesCount: r.likes?.length || 0,
          isLiked: userId
            ? r.likes?.some((l) => l.user?.toString() === userId)
            : false,
        })),
    }));

    res.json({
      success: true,
      data: commentsWithReplies,
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
      message: "تبصرے لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── DELETE COMMENT (Author or Admin) ──
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "تبصرہ نہیں ملا",
      });
    }

    // Allow deletion by comment author or admin
    const isAuthor = comment.user.toString() === req.user.userId;
    const isAdmin = req.user.role === "admin";
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "آپ کو یہ تبصرہ حذف کرنے کی اجازت نہیں",
      });
    }

    // Also delete any replies to this comment
    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(comment._id);

    res.json({
      success: true,
      message: "تبصرہ کامیابی سے حذف ہو گیا",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "تبصرہ حذف کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── LIKE / UNLIKE COMMENT ──
export const toggleLikeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "تبصرہ نہیں ملا",
      });
    }

    const userId = req.user.userId;
    const existingLike = comment.likes.find(
      (l) => l.user.toString() === userId
    );

    if (existingLike) {
      comment.likes = comment.likes.filter(
        (l) => l.user.toString() !== userId
      );
    } else {
      comment.likes.push({ user: userId });
    }

    await comment.save();

    res.json({
      success: true,
      data: {
        likesCount: comment.likes.length,
        isLiked: !existingLike,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "تبصرے کی لائک میں خرابی",
      error: error.message,
    });
  }
};

// ── REPORT COMMENT ──
export const reportComment = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "رپورٹ کی وجہ ضروری ہے",
      });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "تبصرہ نہیں ملا",
      });
    }

    const alreadyReported = comment.reports.some(
      (r) => r.user.toString() === req.user.userId
    );
    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "آپ پہلے ہی اس تبصرے کی رپورٹ کر چکے ہیں",
      });
    }

    comment.reports.push({
      user: req.user.userId,
      reason: reason.trim(),
    });

    // Auto-flag if 3+ pending reports
    if (comment.reports.filter((r) => r.status === "pending").length >= 3) {
      comment.status = "flagged";
    }

    await comment.save();

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

// ── GET REPORTED COMMENTS (Admin Only) ──
export const getReportedComments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { "reports.status": "pending", "reports.0": { $exists: true } };
    const total = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate("user", "name email profileImage")
      .populate("post", "title")
      .populate("reports.user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رپورٹ شدہ تبصرے لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── MODERATE REPORTED COMMENT (Admin - Approve/Reject) ──
export const moderateCommentReport = async (req, res) => {
  try {
    const { commentId, reportId } = req.params;
    const { action } = req.body; // "approved" or "rejected"

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "غلط کارروائی",
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "تبصرہ نہیں ملا" });
    }

    const report = comment.reports.id(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: "رپورٹ نہیں ملی" });
    }

    report.status = action;

    if (action === "approved") {
      comment.status = "hidden";
    } else {
      const pendingReports = comment.reports.filter(
        (r) => r.status === "pending" && r._id.toString() !== reportId
      );
      if (pendingReports.length === 0) {
        comment.status = "active";
      }
    }

    await comment.save();

    res.json({
      success: true,
      message:
        action === "approved"
          ? "رپورٹ منظور - تبصرہ چھپا دیا گیا"
          : "رپورٹ مسترد ہو گئی",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رپورٹ کی کارروائی میں خرابی",
      error: error.message,
    });
  }
};
