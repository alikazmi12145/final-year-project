import VerificationRequest from "../models/VerificationRequest.js";
import FraudReport from "../models/FraudReport.js";
import User from "../models/User.js";

/**
 * VerificationController
 * Handles poet verification requests and fraud reporting.
 * Follows the MVC pattern used throughout the project.
 */
class VerificationController {
  // ─────────────────────────────────────────────────────────────────────────────
  // USER-FACING: Verification
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/verification/apply
   * Submit a new verification request. One active request per user.
   */
  static async applyForVerification(req, res) {
    try {
      const userId = req.user.userId;

      // Prevent reapplication if already verified
      const user = await User.findById(userId).select("isVerified verificationRequest");
      if (!user) {
        return res.status(404).json({ success: false, message: "صارف نہیں ملا" });
      }
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "آپ پہلے سے تصدیق شدہ شاعر ہیں",
        });
      }

      // Block if a pending request already exists
      const existing = await VerificationRequest.findOne({
        userId,
        status: "pending",
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "آپ کی درخواست پہلے سے زیرِ غور ہے",
          requestId: existing._id,
        });
      }

      const {
        fullName,
        penName,
        nationalIdDocumentUrl,
        socialLinks,
        samplePoetry,
        statement,
      } = req.body;

      // Basic validation
      if (!fullName || !samplePoetry) {
        return res.status(400).json({
          success: false,
          message: "مکمل نام اور نمونہ کلام لازمی ہیں",
        });
      }
      if (samplePoetry.trim().length < 50) {
        return res.status(400).json({
          success: false,
          message: "نمونہ کلام کم از کم ۵۰ حروف کا ہونا چاہیے",
        });
      }

      const verificationRequest = await VerificationRequest.create({
        userId,
        fullName: fullName.trim(),
        penName: penName?.trim(),
        nationalIdDocumentUrl: nationalIdDocumentUrl?.trim(),
        socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
        samplePoetry: samplePoetry.trim(),
        statement: statement?.trim(),
        status: "pending",
      });

      // Sync status on User document for quick reads
      await User.findByIdAndUpdate(userId, {
        "verificationRequest.status": "pending",
        "verificationRequest.submittedAt": new Date(),
      });

      return res.status(201).json({
        success: true,
        message: "تصدیق کی درخواست کامیابی سے جمع ہو گئی۔ ایڈمن جلد جائزہ لے گا",
        data: verificationRequest,
      });
    } catch (error) {
      console.error("applyForVerification error:", error);
      return res.status(500).json({
        success: false,
        message: "درخواست جمع کرنے میں خرابی",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/verification/my-status
   * Get the current user's latest verification request.
   */
  static async getMyVerificationStatus(req, res) {
    try {
      const userId = req.user.userId;

      // Fetch the most recent request (could be pending, approved, or rejected)
      const request = await VerificationRequest.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();

      const user = await User.findById(userId)
        .select("isVerified verificationBadge verificationRequest")
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          isVerified: user?.isVerified || false,
          verificationBadge: user?.verificationBadge || "none",
          latestRequest: request || null,
        },
      });
    } catch (error) {
      console.error("getMyVerificationStatus error:", error);
      return res.status(500).json({
        success: false,
        message: "حالت معلوم کرنے میں خرابی",
        error: error.message,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN: Verification Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/admin/verification-requests
   * List all verification requests with filters.
   */
  static async getAdminVerificationRequests(req, res) {
    try {
      const {
        status = "pending",
        page = 1,
        limit = 20,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const filter = {};
      if (status && status !== "all") {
        filter.status = status;
      }

      const [requests, total] = await Promise.all([
        VerificationRequest.find(filter)
          .populate("userId", "name email profileImage role isVerified")
          .populate("reviewedBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        VerificationRequest.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: requests,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("getAdminVerificationRequests error:", error);
      return res.status(500).json({
        success: false,
        message: "درخواستیں حاصل کرنے میں خرابی",
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/admin/verification/:id/approve
   * Approve a verification request → mark user as verified.
   */
  static async approveVerificationRequest(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;
      const { adminRemarks } = req.body;

      const request = await VerificationRequest.findById(id);
      if (!request) {
        return res.status(404).json({ success: false, message: "درخواست نہیں ملی" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "صرف زیرِ التواء درخواستوں کو منظور کیا جا سکتا ہے",
        });
      }

      // Update request document
      request.status = "approved";
      request.adminRemarks = adminRemarks?.trim() || "";
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();

      // Grant verification on User document
      await User.findByIdAndUpdate(request.userId, {
        isVerified: true,
        verificationBadge: "gold",
        "verificationRequest.status": "approved",
        "verificationRequest.reviewedBy": adminId,
        "verificationRequest.reviewedAt": new Date(),
        "verificationRequest.reviewNotes": adminRemarks?.trim() || "",
      });

      return res.status(200).json({
        success: true,
        message: "تصدیق کی درخواست منظور کر لی گئی",
        data: request,
      });
    } catch (error) {
      console.error("approveVerificationRequest error:", error);
      return res.status(500).json({
        success: false,
        message: "منظوری میں خرابی",
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/admin/verification/:id/reject
   * Reject a verification request with remarks.
   */
  static async rejectVerificationRequest(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;
      const { adminRemarks } = req.body;

      if (!adminRemarks || adminRemarks.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "رد کرنے کی وجہ کم از کم ۱۰ حروف ہونی چاہیے",
        });
      }

      const request = await VerificationRequest.findById(id);
      if (!request) {
        return res.status(404).json({ success: false, message: "درخواست نہیں ملی" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "صرف زیرِ التواء درخواستوں کو رد کیا جا سکتا ہے",
        });
      }

      request.status = "rejected";
      request.adminRemarks = adminRemarks.trim();
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();

      // Sync status on User
      await User.findByIdAndUpdate(request.userId, {
        "verificationRequest.status": "rejected",
        "verificationRequest.reviewedBy": adminId,
        "verificationRequest.reviewedAt": new Date(),
        "verificationRequest.reviewNotes": adminRemarks.trim(),
      });

      return res.status(200).json({
        success: true,
        message: "تصدیق کی درخواست رد کر دی گئی",
        data: request,
      });
    } catch (error) {
      console.error("rejectVerificationRequest error:", error);
      return res.status(500).json({
        success: false,
        message: "رد کرنے میں خرابی",
        error: error.message,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // USER-FACING: Fraud Reporting
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/report
   * Submit a fraud report against another user.
   */
  static async submitFraudReport(req, res) {
    try {
      const reportedBy = req.user.userId;
      const { reportedUserId, reason, description, evidenceUrls } = req.body;

      if (!reportedUserId || !reason || !description) {
        return res.status(400).json({
          success: false,
          message: "رپورٹ کردہ صارف، وجہ اور تفصیل لازمی ہیں",
        });
      }

      // Cannot report yourself
      if (reportedUserId === String(reportedBy)) {
        return res.status(400).json({
          success: false,
          message: "آپ اپنے آپ کو رپورٹ نہیں کر سکتے",
        });
      }

      // Verify the target user exists
      const targetUser = await User.findById(reportedUserId).select("_id");
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "رپورٹ کردہ صارف نہیں ملا",
        });
      }

      if (description.trim().length < 20) {
        return res.status(400).json({
          success: false,
          message: "تفصیل کم از کم ۲۰ حروف ہونی چاہیے",
        });
      }

      // Check for existing active report from same reporter against same user
      const duplicate = await FraudReport.findOne({
        reportedUserId,
        reportedBy,
        status: "pending",
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "آپ نے اس صارف کے خلاف پہلے سے رپورٹ جمع کی ہوئی ہے",
        });
      }

      const report = await FraudReport.create({
        reportedUserId,
        reportedBy,
        reason,
        description: description.trim(),
        evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 5) : [],
        status: "pending",
      });

      return res.status(201).json({
        success: true,
        message: "رپورٹ کامیابی سے جمع ہو گئی۔ ایڈمن جلد جائزہ لے گا",
        data: { reportId: report._id },
      });
    } catch (error) {
      console.error("submitFraudReport error:", error);
      return res.status(500).json({
        success: false,
        message: "رپورٹ جمع کرنے میں خرابی",
        error: error.message,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN: Fraud Report Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/admin/reports
   * List all fraud reports with pagination and status filter.
   */
  static async getAdminFraudReports(req, res) {
    try {
      const { status = "pending", page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const filter = {};
      if (status && status !== "all") {
        filter.status = status;
      }

      const [reports, total] = await Promise.all([
        FraudReport.find(filter)
          .populate("reportedUserId", "name email profileImage isVerified role")
          .populate("reportedBy", "name email")
          .populate("resolvedBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        FraudReport.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: reports,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("getAdminFraudReports error:", error);
      return res.status(500).json({
        success: false,
        message: "رپورٹس حاصل کرنے میں خرابی",
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/admin/report/:id/resolve
   * Mark a fraud report as resolved (or dismissed).
   */
  static async resolveReport(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;
      const { action = "resolved", adminNotes } = req.body;

      if (!["resolved", "dismissed"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "عمل صرف 'resolved' یا 'dismissed' ہو سکتا ہے",
        });
      }

      const report = await FraudReport.findById(id);
      if (!report) {
        return res.status(404).json({ success: false, message: "رپورٹ نہیں ملی" });
      }
      if (report.status === "resolved" || report.status === "dismissed") {
        return res.status(400).json({
          success: false,
          message: "یہ رپورٹ پہلے سے نمٹائی جا چکی ہے",
        });
      }

      report.status = action;
      report.adminNotes = adminNotes?.trim() || "";
      report.resolvedBy = adminId;
      report.resolvedAt = new Date();
      await report.save();

      return res.status(200).json({
        success: true,
        message: action === "resolved" ? "رپورٹ حل کر دی گئی" : "رپورٹ مسترد کر دی گئی",
        data: report,
      });
    } catch (error) {
      console.error("resolveReport error:", error);
      return res.status(500).json({
        success: false,
        message: "رپورٹ نمٹانے میں خرابی",
        error: error.message,
      });
    }
  }
}

export default VerificationController;
