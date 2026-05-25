/**
 * copyrightValidation.js
 * Express middleware for validating copyright module requests.
 */

const LICENSE_TYPES = [
  "all_rights_reserved",
  "cc_by",
  "cc_by_sa",
  "cc_by_nc",
  "public_domain",
  "personal_copyright",
];

const REPORT_REASONS = [
  "plagiarism",
  "unauthorized_reproduction",
  "license_violation",
  "false_attribution",
  "derivative_without_permission",
  "other",
];

const ADMIN_ACTIONS = [
  "warning",
  "poem_unpublished",
  "poem_removed",
  "user_suspended",
  "user_banned",
];

const isMongoId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

export function validateLicenseUpdate(req, res, next) {
  const { license } = req.body || {};
  if (!license || !LICENSE_TYPES.includes(license)) {
    return res.status(400).json({
      success: false,
      message: `Invalid license. Allowed: ${LICENSE_TYPES.join(", ")}`,
    });
  }
  next();
}

export function validateReport(req, res, next) {
  const {
    poemId,
    reason,
    description,
    evidenceLinks = [],
    originalPoemId,
  } = req.body || {};

  if (!isMongoId(poemId)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid poemId is required" });
  }
  if (!REPORT_REASONS.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `reason must be one of: ${REPORT_REASONS.join(", ")}`,
    });
  }
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < 20
  ) {
    return res.status(400).json({
      success: false,
      message: "description must be at least 20 characters",
    });
  }
  if (description.length > 2000) {
    return res
      .status(400)
      .json({ success: false, message: "description too long (max 2000)" });
  }
  if (!Array.isArray(evidenceLinks)) {
    return res
      .status(400)
      .json({ success: false, message: "evidenceLinks must be an array" });
  }
  if (evidenceLinks.length > 10) {
    return res
      .status(400)
      .json({ success: false, message: "Maximum 10 evidence links" });
  }
  for (const link of evidenceLinks) {
    if (typeof link !== "string" || link.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid evidence link" });
    }
  }
  if (originalPoemId && !isMongoId(originalPoemId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid originalPoemId" });
  }
  next();
}

export function validateAdminDecision(req, res, next) {
  const { decision, adminNotes, action, suspensionDays } = req.body || {};
  if (!["approve", "reject", "under_review"].includes(decision)) {
    return res
      .status(400)
      .json({ success: false, message: "decision must be approve|reject|under_review" });
  }
  if (adminNotes && (typeof adminNotes !== "string" || adminNotes.length > 2000)) {
    return res
      .status(400)
      .json({ success: false, message: "adminNotes too long" });
  }
  if (decision === "approve") {
    if (!ADMIN_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `action must be one of: ${ADMIN_ACTIONS.join(", ")}`,
      });
    }
    if (
      action === "user_suspended" &&
      (typeof suspensionDays !== "number" || suspensionDays < 1 || suspensionDays > 365)
    ) {
      return res.status(400).json({
        success: false,
        message: "suspensionDays must be a number between 1 and 365",
      });
    }
  }
  next();
}

export const COPYRIGHT_CONSTANTS = {
  LICENSE_TYPES,
  REPORT_REASONS,
  ADMIN_ACTIONS,
};
