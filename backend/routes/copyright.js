/**
 * routes/copyright.js
 * Copyright Management Module routes.
 *
 * Mounted at /api/copyright and /api/admin (admin endpoints share prefix
 * through server.js — see comments below). For convenience and lower coupling
 * we expose two routers here.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import CopyrightController from "../controllers/copyrightController.js";
import { auth, adminAuth } from "../middleware/auth.js";
import {
  validateLicenseUpdate,
  validateReport,
  validateAdminDecision,
  COPYRIGHT_CONSTANTS,
} from "../validations/copyrightValidation.js";

/* ─────────── User / Public router (mounted at /api/copyright) ─────────── */
const router = express.Router();

// Rate limit: max 10 reports / hour / user
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reports submitted. Try again later.",
  },
});

router.get("/constants", (_req, res) =>
  res.json({ success: true, data: COPYRIGHT_CONSTANTS })
);

router.post(
  "/report",
  auth,
  reportLimiter,
  validateReport,
  CopyrightController.submitReport
);
router.get("/reports", auth, CopyrightController.listMyReports);
router.get("/report/:id", auth, CopyrightController.getReport);
router.delete("/report/:id", auth, CopyrightController.withdrawReport);
router.get("/my-violations", auth, CopyrightController.getMyViolations);

router.post(
  "/check-similarity",
  auth,
  CopyrightController.checkSimilarity
);

router.get("/poem/:id/info", CopyrightController.getCopyrightInfo);
router.patch(
  "/poem/:id/license",
  auth,
  validateLicenseUpdate,
  CopyrightController.updatePoemLicense
);

export default router;

/* ─────────── Admin router (mounted at /api/admin) ─────────── */
const adminRouter = express.Router();

adminRouter.get(
  "/copyright-reports",
  adminAuth,
  CopyrightController.listAdminReports
);
adminRouter.get(
  "/copyright-report/:id",
  adminAuth,
  CopyrightController.getReport
);
adminRouter.patch(
  "/copyright/:id",
  adminAuth,
  validateAdminDecision,
  CopyrightController.decideReport
);
adminRouter.get(
  "/violations",
  adminAuth,
  CopyrightController.listViolations
);
adminRouter.patch(
  "/violations/:id",
  adminAuth,
  CopyrightController.updateViolation
);

export { adminRouter };
