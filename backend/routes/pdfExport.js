import express from "express";
import PDFExportController from "../controllers/pdfExportController.js";
import { auth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for PDF exports
const pdfExportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 PDF exports per windowMs
  message: "Too many PDF export requests, please try again later.",
});

/**
 * @route   GET /api/pdf/poem/:poemId
 * @desc    Export single poem as PDF
 * @access  Private
 */
router.get(
  "/poem/:poemId",
  auth,
  pdfExportLimiter,
  PDFExportController.exportPoemPDF
);

/**
 * @route   POST /api/pdf/collection
 * @desc    Export multiple poems as PDF collection
 * @access  Private
 * @body    { poemIds: string[] }
 */
router.post(
  "/collection",
  auth,
  pdfExportLimiter,
  PDFExportController.exportCollectionPDF
);

export default router;
