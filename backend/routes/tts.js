import express from "express";
import rateLimit from "express-rate-limit";
import TTSController from "../controllers/ttsController.js";
import {
  validateGenerate,
  validateMongoId,
  validateAudioFilename,
} from "../validations/ttsValidation.js";

const router = express.Router();

// Heavy-duty synthesis endpoints get a tighter limit than read endpoints.
const ttsGenerateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many TTS requests. Please try again in a minute." },
});

const ttsReadLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// ─── New production API ──────────────────────────────────────────────────────
router.post  ("/generate",         ttsGenerateLimit, validateGenerate,      TTSController.generate);
router.get   ("/audio/:filename",  ttsReadLimit,     validateAudioFilename, TTSController.streamAudio);
router.get   ("/voices",           ttsReadLimit,                            TTSController.listVoices);
router.get   ("/:id",              ttsReadLimit,     validateMongoId,       TTSController.getRecitation);
router.delete("/:id",              ttsGenerateLimit, validateMongoId,       TTSController.deleteRecitation);

// ─── Legacy endpoints (kept for backwards compatibility) ─────────────────────
router.post("/",            ttsGenerateLimit, TTSController.tts);
router.post("/synthesize",  ttsGenerateLimit, TTSController.synthesizeRecitation);
router.post("/download",    ttsGenerateLimit, TTSController.downloadRecitation);

export default router;
