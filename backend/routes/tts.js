import express from "express";
import rateLimit from "express-rate-limit";
import TTSController from "../controllers/ttsController.js";

const router = express.Router();

const ttsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many TTS requests. Please try again in a minute.",
  },
});

// ── Clean ElevenLabs endpoint (recommended) ───────────────────────────────────
// POST /api/tts  { text, voiceId? }  → audio/mpeg binary
// Returns a clear error (no silent gTTS fallback) when the API key is missing.
router.post("/", ttsRateLimit, TTSController.tts);

// ── Legacy endpoints (kept for backwards compatibility) ───────────────────────
router.post("/generate",   ttsRateLimit, TTSController.generateRecitation);
router.post("/synthesize", ttsRateLimit, TTSController.synthesizeRecitation);
router.post("/download",   ttsRateLimit, TTSController.downloadRecitation);
router.get("/voices",      ttsRateLimit, TTSController.listVoices);

export default router;
