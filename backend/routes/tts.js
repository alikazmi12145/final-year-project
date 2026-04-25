import express from "express";
import rateLimit from "express-rate-limit";
import TTSController from "../controllers/ttsController.js";

const router = express.Router();

const ttsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many TTS requests. Please try again in a minute.",
  },
});

router.post("/download", ttsRateLimit, TTSController.downloadRecitation);

export default router;
