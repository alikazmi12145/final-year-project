/**
 * copyrightController.js
 * Handlers for the Copyright Management Module.
 *
 * Public surface:
 *  - updatePoemLicense          PATCH /api/poems/:id/license  (poet/admin)
 *  - getCopyrightInfo           GET   /api/poems/:id/copyright
 *  - submitReport               POST  /api/copyright/report   (auth)
 *  - withdrawReport             DELETE /api/copyright/report/:id (auth-reporter)
 *  - listMyReports              GET   /api/copyright/reports  (auth)
 *  - getReport                  GET   /api/copyright/report/:id (auth)
 *  - listAdminReports           GET   /api/admin/copyright-reports (admin)
 *  - decideReport               PATCH /api/admin/copyright/:id (admin)
 *  - listViolations             GET   /api/admin/violations   (admin)
 *  - updateViolation            PATCH /api/admin/violations/:id (admin)
 *  - getMyViolations            GET   /api/copyright/my-violations (auth)
 */
import mongoose from "mongoose";
import CopyrightReport from "../models/CopyrightReport.js";
import CopyrightViolation from "../models/CopyrightViolation.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import {
  computeSimilarity,
  detectDuplicates,
  HIGH_SIMILARITY,
  SUSPICIOUS_SIMILARITY,
} from "../services/similarityService.js";

const LICENSE_LABEL = {
  all_rights_reserved: "All Rights Reserved",
  cc_by: "Creative Commons BY",
  cc_by_sa: "Creative Commons BY-SA",
  cc_by_nc: "Creative Commons BY-NC",
  public_domain: "Public Domain",
  personal_copyright: "Personal Copyright",
};

function buildCopyrightNotice(poem, authorName) {
  const year = poem.createdAt
    ? new Date(poem.createdAt).getFullYear()
    : new Date().getFullYear();
  const label = LICENSE_LABEL[poem.license] || LICENSE_LABEL.all_rights_reserved;
  return `© ${year} ${authorName || "Unknown Author"} — ${label}`;
}

function emitNotification(req, userId, payload) {
  try {
    const io = req.app.get("io");
    if (io && userId) io.to(String(userId)).emit("notification", payload);
  } catch (err) {
    console.warn("[copyright] socket emit failed:", err.message);
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Poem license & copyright info                                         */
/* ─────────────────────────────────────────────────────────────────────── */

export const updatePoemLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { license } = req.body;
    const userId = req.user.userId;

    const poem = await Poem.findById(id);
    if (!poem) {
      return res.status(404).json({ success: false, message: "Poem not found" });
    }

    // Only author or admin
    if (
      String(poem.author) !== String(userId) &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to change license" });
    }

    poem.license = license;
    poem.copyright = license === "public_domain" ? "public_domain" : poem.copyright;
    // refresh notice
    const author = await User.findById(poem.author).select("name");
    poem.copyrightNotice = buildCopyrightNotice(poem, author?.name);
    await poem.save();

    return res.json({
      success: true,
      message: "License updated",
      data: {
        license: poem.license,
        copyrightNotice: poem.copyrightNotice,
      },
    });
  } catch (err) {
    console.error("[copyright] updatePoemLicense error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update license" });
  }
};

export const getCopyrightInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const poem = await Poem.findById(id)
      .populate("author", "name profileImage")
      .select(
        "title author license copyright copyrightNotice similarityScore flaggedForSimilarity createdAt"
      );
    if (!poem) {
      return res.status(404).json({ success: false, message: "Poem not found" });
    }
    return res.json({
      success: true,
      data: {
        poemId: poem._id,
        title: poem.title,
        author: poem.author,
        license: poem.license || "all_rights_reserved",
        licenseLabel:
          LICENSE_LABEL[poem.license] || LICENSE_LABEL.all_rights_reserved,
        copyrightNotice:
          poem.copyrightNotice ||
          buildCopyrightNotice(poem, poem.author?.name),
        createdAt: poem.createdAt,
        similarityScore: poem.similarityScore || 0,
        flaggedForSimilarity: !!poem.flaggedForSimilarity,
      },
    });
  } catch (err) {
    console.error("[copyright] getCopyrightInfo error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch copyright info" });
  }
};

/* ─────────────────────────────────────────────────────────────────────── */
/*  User report submission                                                */
/* ─────────────────────────────────────────────────────────────────────── */

export const submitReport = async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const {
      poemId,
      reason,
      description,
      evidenceLinks = [],
      originalPoemId,
    } = req.body;

    const poem = await Poem.findById(poemId).select("author content title");
    if (!poem) {
      return res.status(404).json({ success: false, message: "Poem not found" });
    }
    if (String(poem.author) === String(reporterId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot report your own poem",
      });
    }

    // Block duplicates
    const dupe = await CopyrightReport.findOne({
      reporterId,
      poemId,
      status: { $in: ["pending", "under_review"] },
    });
    if (dupe) {
      return res.status(409).json({
        success: false,
        message: "You already have an active report on this poem",
        reportId: dupe._id,
      });
    }

    // Optional similarity computation against the alleged original
    let similarityScore = 0;
    if (originalPoemId) {
      const orig = await Poem.findById(originalPoemId).select("content");
      if (orig) similarityScore = computeSimilarity(poem.content, orig.content);
    }

    const report = await CopyrightReport.create({
      reporterId,
      poemId,
      reportedUserId: poem.author,
      originalPoemId: originalPoemId || undefined,
      reason,
      description: description.trim(),
      evidenceLinks: evidenceLinks.filter(Boolean),
      similarityScore,
      timeline: [
        {
          status: "pending",
          note: "Report submitted",
          actor: reporterId,
        },
      ],
    });

    // Notify the reported author
    try {
      const notif = await Notification.create({
        userId: poem.author,
        type: "admin",
        title: "کاپی رائٹ رپورٹ",
        message:
          "آپ کی ایک نظم پر کاپی رائٹ کی شکایت موصول ہوئی ہے۔ ایڈمن جلد جائزہ لے گا۔",
        relatedId: report._id,
      });
      emitNotification(req, poem.author, {
        _id: notif._id,
        type: "admin",
        title: notif.title,
        message: notif.message,
      });
    } catch (e) {
      console.warn("[copyright] notify author failed:", e.message);
    }

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      data: { reportId: report._id, similarityScore },
    });
  } catch (err) {
    console.error("[copyright] submitReport error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit report" });
  }
};

export const withdrawReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const report = await CopyrightReport.findById(id);
    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });
    if (String(report.reporterId) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }
    if (!["pending", "under_review"].includes(report.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot withdraw a decided report" });
    }
    report.status = "withdrawn";
    report.timeline.push({
      status: "withdrawn",
      note: "Withdrawn by reporter",
      actor: userId,
    });
    await report.save();
    return res.json({ success: true, message: "Report withdrawn" });
  } catch (err) {
    console.error("[copyright] withdrawReport error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to withdraw report" });
  }
};

export const listMyReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { reporterId: userId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      CopyrightReport.find(filter)
        .populate("poemId", "title author")
        .populate("reportedUserId", "name profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CopyrightReport.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[copyright] listMyReports error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch reports" });
  }
};

export const getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === "admin";

    const report = await CopyrightReport.findById(id)
      .populate("reporterId", "name profileImage")
      .populate("reportedUserId", "name profileImage email")
      .populate("poemId", "title content author createdAt license")
      .populate("originalPoemId", "title content author createdAt license")
      .populate("reviewedBy", "name")
      .populate("violationId");

    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });

    if (
      !isAdmin &&
      String(report.reporterId?._id) !== String(userId) &&
      String(report.reportedUserId?._id) !== String(userId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error("[copyright] getReport error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch report" });
  }
};

/* ─────────────────────────────────────────────────────────────────────── */
/*  Admin endpoints                                                       */
/* ─────────────────────────────────────────────────────────────────────── */

export const listAdminReports = async (req, res) => {
  try {
    const {
      status,
      reason,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (reason) filter.reason = reason;

    if (search) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ description: re }, { adminNotes: re }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, stats] = await Promise.all([
      CopyrightReport.find(filter)
        .populate("reporterId", "name email profileImage")
        .populate("reportedUserId", "name email profileImage")
        .populate("poemId", "title content createdAt")
        .populate("originalPoemId", "title content createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CopyrightReport.countDocuments(filter),
      CopyrightReport.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const s of stats) if (s._id in counts) counts[s._id] = s.count;

    return res.json({
      success: true,
      data: items,
      counts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[copyright] listAdminReports error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch reports" });
  }
};

export const decideReport = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const {
      decision, // approve | reject | under_review
      adminNotes = "",
      action, // required when decision === approve
      suspensionDays,
    } = req.body;
    const adminId = req.user.userId;

    const report = await CopyrightReport.findById(id).session(session);
    if (!report) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    if (["approved", "rejected", "withdrawn"].includes(report.status)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Report already decided" });
    }

    let violation = null;
    let nextStatus;

    if (decision === "under_review") {
      nextStatus = "under_review";
    } else if (decision === "reject") {
      nextStatus = "rejected";
    } else {
      // approve → create violation & enforce action
      nextStatus = "approved";

      const poem = await Poem.findById(report.poemId).session(session);
      if (!poem) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: "Reported poem no longer exists" });
      }

      // Apply enforcement
      let suspensionStatus = "none";
      let suspendedUntil;
      if (action === "poem_unpublished") {
        poem.published = false;
        poem.status = "flagged";
      } else if (action === "poem_removed") {
        poem.status = "rejected";
        poem.published = false;
      } else if (action === "user_suspended") {
        const days = Number(suspensionDays) || 7;
        suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        suspensionStatus = "active";
        await User.findByIdAndUpdate(
          report.reportedUserId,
          { status: "suspended", suspendedUntil },
          { session }
        );
      } else if (action === "user_banned") {
        await User.findByIdAndUpdate(
          report.reportedUserId,
          { status: "banned" },
          { session }
        );
      }
      await poem.save({ session });

      const [created] = await CopyrightViolation.create(
        [
          {
            violatorId: report.reportedUserId,
            poemId: report.poemId,
            reportId: report._id,
            actionTaken: action,
            reason: adminNotes,
            suspensionStatus,
            suspendedUntil,
            issuedBy: adminId,
          },
        ],
        { session }
      );
      violation = created;
      report.violationId = created._id;
    }

    report.status = nextStatus;
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();
    if (adminNotes) report.adminNotes = adminNotes;
    report.timeline.push({
      status: nextStatus,
      note: adminNotes || `Decision: ${decision}`,
      actor: adminId,
    });
    await report.save({ session });

    await session.commitTransaction();

    // Notifications (outside txn — best-effort)
    try {
      const titleByStatus = {
        approved: "کاپی رائٹ رپورٹ منظور",
        rejected: "کاپی رائٹ رپورٹ مسترد",
        under_review: "آپ کی رپورٹ جائزے میں ہے",
      };
      const reporterNotif = await Notification.create({
        userId: report.reporterId,
        type: "admin",
        title: titleByStatus[nextStatus] || "کاپی رائٹ رپورٹ کی تازہ کاری",
        message: adminNotes || `Status: ${nextStatus}`,
        relatedId: report._id,
      });
      emitNotification(req, report.reporterId, {
        _id: reporterNotif._id,
        type: "admin",
        title: reporterNotif.title,
        message: reporterNotif.message,
      });

      if (nextStatus === "approved") {
        const violNotif = await Notification.create({
          userId: report.reportedUserId,
          type: "admin",
          title: "کاپی رائٹ کی خلاف ورزی کا فیصلہ",
          message:
            adminNotes ||
            "آپ کی نظم کے خلاف کاپی رائٹ کی شکایت کو درست تسلیم کیا گیا۔",
          relatedId: report._id,
        });
        emitNotification(req, report.reportedUserId, {
          _id: violNotif._id,
          type: "admin",
          title: violNotif.title,
          message: violNotif.message,
        });
      }
    } catch (e) {
      console.warn("[copyright] decision notify failed:", e.message);
    }

    return res.json({
      success: true,
      message: "Decision recorded",
      data: { status: nextStatus, violation },
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    console.error("[copyright] decideReport error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record decision" });
  } finally {
    session.endSession();
  }
};

export const listViolations = async (req, res) => {
  try {
    const { violatorId, action, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (violatorId) filter.violatorId = violatorId;
    if (action) filter.actionTaken = action;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      CopyrightViolation.find(filter)
        .populate("violatorId", "name email profileImage status")
        .populate("poemId", "title")
        .populate("issuedBy", "name")
        .populate("reportId", "reason description")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CopyrightViolation.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[copyright] listViolations error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch violations" });
  }
};

export const updateViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspensionStatus, reason } = req.body;

    const allowed = ["none", "active", "expired", "lifted"];
    if (suspensionStatus && !allowed.includes(suspensionStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid suspensionStatus" });
    }

    const violation = await CopyrightViolation.findById(id);
    if (!violation)
      return res
        .status(404)
        .json({ success: false, message: "Violation not found" });

    if (suspensionStatus) violation.suspensionStatus = suspensionStatus;
    if (reason != null) violation.reason = reason;

    // Lifting a suspension reactivates user
    if (suspensionStatus === "lifted") {
      await User.findByIdAndUpdate(violation.violatorId, {
        status: "active",
        suspendedUntil: null,
      });
    }
    await violation.save();
    return res.json({ success: true, message: "Violation updated", data: violation });
  } catch (err) {
    console.error("[copyright] updateViolation error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update violation" });
  }
};

export const getMyViolations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const items = await CopyrightViolation.find({ violatorId: userId })
      .populate("poemId", "title")
      .populate("reportId", "reason description")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("[copyright] getMyViolations error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch violations" });
  }
};

/* ─────────────────────────────────────────────────────────────────────── */
/*  Similarity check (callable from poem create flow)                     */
/* ─────────────────────────────────────────────────────────────────────── */

export const checkSimilarity = async (req, res) => {
  try {
    const { content, excludePoemId } = req.body || {};
    if (!content || content.length < 30) {
      return res
        .status(400)
        .json({ success: false, message: "content too short" });
    }
    const { bestMatch, score, candidates } = await detectDuplicates(
      content,
      excludePoemId
    );
    return res.json({
      success: true,
      data: {
        score,
        flagged: score >= HIGH_SIMILARITY,
        suspicious: score >= SUSPICIOUS_SIMILARITY,
        bestMatch: bestMatch
          ? {
              poemId: bestMatch._id,
              title: bestMatch.title,
            }
          : null,
        candidates,
      },
    });
  } catch (err) {
    console.error("[copyright] checkSimilarity error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to check similarity" });
  }
};

export default {
  updatePoemLicense,
  getCopyrightInfo,
  submitReport,
  withdrawReport,
  listMyReports,
  getReport,
  listAdminReports,
  decideReport,
  listViolations,
  updateViolation,
  getMyViolations,
  checkSimilarity,
};
