import express from "express";
import { body, validationResult } from "express-validator";
import { auth } from "../middleware/auth.js";
import VerificationController from "../controllers/verificationController.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Input validation helper
// ─────────────────────────────────────────────────────────────────────────────
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
// POST /api/verification/apply  — Submit verification request
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/apply",
  auth,
  [
    body("fullName")
      .trim()
      .notEmpty()
      .withMessage("مکمل نام درج کریں")
      .isLength({ max: 150 })
      .withMessage("نام بہت طویل ہے"),

    body("samplePoetry")
      .trim()
      .notEmpty()
      .withMessage("نمونہ کلام درج کریں")
      .isLength({ min: 50, max: 5000 })
      .withMessage("نمونہ کلام ۵۰ سے ۵۰۰۰ حروف کے درمیان ہونا چاہیے"),

    body("penName")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("تخلص بہت طویل ہے"),

    body("socialLinks")
      .optional()
      .isArray({ max: 10 })
      .withMessage("سوشل لنک بہت زیادہ ہیں"),

    body("statement")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("بیانیہ بہت طویل ہے"),
  ],
  handleValidationErrors,
  VerificationController.applyForVerification
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/verification/my-status  — Check own verification status
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-status", auth, VerificationController.getMyVerificationStatus);

export default router;
