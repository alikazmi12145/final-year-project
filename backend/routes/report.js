import express from "express";
import { body, validationResult } from "express-validator";
import { auth } from "../middleware/auth.js";
import VerificationController from "../controllers/verificationController.js";

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "درخواست کی معلومات درست نہیں",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/report  — Submit a fraud / abuse report
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  auth,
  [
    body("reportedUserId")
      .notEmpty()
      .withMessage("رپورٹ کردہ صارف کا ID درج کریں")
      .isMongoId()
      .withMessage("غلط صارف ID"),

    body("reason")
      .notEmpty()
      .withMessage("وجہ درج کریں")
      .isIn([
        "impersonation",
        "fake_credentials",
        "plagiarism",
        "spam",
        "harassment",
        "other",
      ])
      .withMessage("غلط وجہ"),

    body("description")
      .trim()
      .notEmpty()
      .withMessage("تفصیل درج کریں")
      .isLength({ min: 20, max: 2000 })
      .withMessage("تفصیل ۲۰ سے ۲۰۰۰ حروف کے درمیان ہونی چاہیے"),

    body("evidenceUrls")
      .optional()
      .isArray({ max: 5 })
      .withMessage("ثبوت کے روابط ۵ سے زیادہ نہیں ہو سکتے"),
  ],
  handleValidationErrors,
  VerificationController.submitFraudReport
);

export default router;
