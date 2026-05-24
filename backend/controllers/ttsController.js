/**
 * ttsController.js
 *
 * Production-ready Urdu Poetry Text-to-Speech controller.
 *
 * NEW endpoints (preferred — JSON response, persistent storage, dedup):
 *   POST   /api/tts/generate            → generate + persist + return metadata
 *   GET    /api/tts/:id                 → fetch a recitation record
 *   GET    /api/tts/audio/:filename     → stream the stored MP3 (Range supported)
 *   DELETE /api/tts/:id                 → cleanup
 *
 * Legacy endpoints (kept for backwards compatibility):
 *   POST   /api/tts                     → binary stream
 *   POST   /api/tts/synthesize          → JSON with audio URL (delegates to generate)
 *   POST   /api/tts/download            → force MP3 download
 *   GET    /api/tts/voices              → list provider voices
 */

import fs from "fs";

import Recitation from "../models/Recitation.js";
import {
  synthesizeSpeech,
  listAvailableProviders,
  EDGE_URDU_VOICES,
} from "../services/ttsService.js";
import {
  saveRecitationBuffer,
  resolveRecitationPath,
  deleteRecitationFile,
  recitationFileExists,
} from "../services/storageService.js";
import {
  sanitizeText,
  normalizeForHash,
  estimateDurationSeconds,
} from "../utils/textNormalizer.js";
import { buildRecitationHash } from "../utils/hash.js";

const buildPublicUrl = (req, relativePath) => {
  const protocol = req.protocol || "http";
  const host = req.get("host");
  return `${protocol}://${host}${relativePath}`;
};

const clampSpeed = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.5, n));
};

class TTSController {
  /**
   * POST /api/tts/generate
   *
   * Pipeline:
   *   1. Sanitise + normalise + hash the request.
   *   2. Reuse the stored MP3 if the same hash exists.
   *   3. Otherwise call the provider chain (Google → ElevenLabs → gTTS).
   *   4. Persist the MP3 to /storage/recitations and a Recitation doc to Mongo.
   */
  static async generate(req, res) {
    try {
      const {
        text,
        mode = "poetry",
        voice,
        speed = 1,
        provider = "auto",
        language = "ur-PK",
      } = req.body;

      const cleaned = sanitizeText(text);
      if (!cleaned) {
        return res.status(400).json({ success: false, message: "Poetry text is required." });
      }

      const safeSpeed  = clampSpeed(speed);
      const safeMode   = mode === "normal" ? "normal" : "poetry";
      const normalized = normalizeForHash(cleaned);

      // 1. Dedup lookup ─────────────────────────────────────────────────────
      const hashKey = buildRecitationHash({
        normalizedText: normalized,
        provider,
        voice: voice || "default",
        mode: safeMode,
        speed: safeSpeed,
        language,
      });

      const existing = await Recitation.findOne({ hashSignature: hashKey });
      if (existing && recitationFileExists(existing.audioFileName)) {
        existing.accessCount   += 1;
        existing.lastAccessedAt = new Date();
        await existing.save();

        return res.json({
          success: true,
          data: {
            id:            existing._id,
            audioUrl:      buildPublicUrl(req, existing.audioUrl),
            audioPath:     existing.audioUrl,
            audioFileName: existing.audioFileName,
            duration:      existing.duration,
            provider:      existing.provider,
            voice:         existing.voice,
            mode:          existing.mode,
            cached:        true,
            createdAt:     existing.createdAt,
          },
        });
      }

      // 2. Generate fresh audio ─────────────────────────────────────────────
      const { buffer, provider: usedProvider, voice: usedVoice } =
        await synthesizeSpeech({
          text: cleaned,
          mode: safeMode,
          voice,
          speed: safeSpeed,
          language,
          preferredProvider: provider,
        });

      // 3. Persist to disk ──────────────────────────────────────────────────
      const fileName = `${hashKey.slice(0, 24)}.mp3`;
      const stored = await saveRecitationBuffer(buffer, fileName);

      // 4. Persist Mongo doc (upsert avoids races on duplicate keys) ────────
      const duration = estimateDurationSeconds(cleaned, safeSpeed);
      const doc = await Recitation.findOneAndUpdate(
        { hashSignature: hashKey },
        {
          $setOnInsert: {
            originalText:   cleaned,
            normalizedText: normalized,
            hashSignature:  hashKey,
          },
          $set: {
            audioUrl:       stored.publicUrl,
            audioFileName:  stored.fileName,
            fileSize:       stored.fileSize,
            duration,
            provider:       usedProvider,
            voice:          usedVoice,
            mode:           safeMode,
            speed:          safeSpeed,
            language,
            lastAccessedAt: new Date(),
          },
          $inc: { accessCount: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(201).json({
        success: true,
        data: {
          id:            doc._id,
          audioUrl:      buildPublicUrl(req, doc.audioUrl),
          audioPath:     doc.audioUrl,
          audioFileName: doc.audioFileName,
          duration:      doc.duration,
          provider:      doc.provider,
          voice:         doc.voice,
          mode:          doc.mode,
          cached:        false,
          createdAt:     doc.createdAt,
        },
      });
    } catch (err) {
      console.error("[TTS] generate failed:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Unable to generate recitation.",
      });
    }
  }

  /** GET /api/tts/:id */
  static async getRecitation(req, res) {
    try {
      const doc = await Recitation.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Recitation not found." });

      return res.json({
        success: true,
        data: {
          id:            doc._id,
          originalText:  doc.originalText,
          audioUrl:      buildPublicUrl(req, doc.audioUrl),
          audioPath:     doc.audioUrl,
          audioFileName: doc.audioFileName,
          duration:      doc.duration,
          provider:      doc.provider,
          voice:         doc.voice,
          mode:          doc.mode,
          accessCount:   doc.accessCount,
          createdAt:     doc.createdAt,
        },
      });
    } catch (err) {
      console.error("[TTS] getRecitation failed:", err);
      return res.status(500).json({ success: false, message: "Unable to load recitation." });
    }
  }

  /**
   * GET /api/tts/audio/:filename
   *
   * Streams the stored MP3 with HTTP Range support so the HTML5 <audio>
   * element can seek instantly even on long recitations / slow networks.
   */
  static async streamAudio(req, res) {
    try {
      const absPath = resolveRecitationPath(req.params.filename);
      if (!absPath) {
        return res.status(404).json({ success: false, message: "Audio file not found." });
      }

      const stat = await fs.promises.stat(absPath);
      const range = req.headers.range;

      res.setHeader("Content-Type",  "audio/mpeg");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400");

      if (!range) {
        res.setHeader("Content-Length", stat.size);
        return fs.createReadStream(absPath).pipe(res);
      }

      const match = /bytes=(\d+)-(\d+)?/.exec(range);
      if (!match) {
        res.status(416).setHeader("Content-Range", `bytes */${stat.size}`);
        return res.end();
      }

      const start = parseInt(match[1], 10);
      const end   = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (start >= stat.size || end >= stat.size) {
        res.status(416).setHeader("Content-Range", `bytes */${stat.size}`);
        return res.end();
      }

      res.status(206);
      res.setHeader("Content-Range",  `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Content-Length", end - start + 1);
      fs.createReadStream(absPath, { start, end }).pipe(res);
    } catch (err) {
      console.error("[TTS] streamAudio failed:", err);
      if (!res.headersSent) res.status(500).json({ success: false, message: "Stream failed." });
    }
  }

  /** DELETE /api/tts/:id */
  static async deleteRecitation(req, res) {
    try {
      const doc = await Recitation.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Recitation not found." });

      await deleteRecitationFile(doc.audioFileName);
      await doc.deleteOne();

      return res.json({ success: true, message: "Recitation deleted." });
    } catch (err) {
      console.error("[TTS] deleteRecitation failed:", err);
      return res.status(500).json({ success: false, message: "Unable to delete recitation." });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LEGACY ENDPOINTS — preserved so older clients keep working
  // ───────────────────────────────────────────────────────────────────────────

  /** GET /api/tts/voices */
  static async listVoices(req, res) {
    try {
      const providers = await listAvailableProviders();

      const edgeVoices = EDGE_URDU_VOICES.map((v) => ({
        id: v.id,
        label: v.label,
        provider: "edge",
        available: providers.edge,
        language: v.locale,
        gender: v.gender,
        recommendedForUrdu: true,
      }));

      const voices = [
        ...edgeVoices,
        { id: "ur-PK-Standard-A", label: "Google Urdu (Female)", provider: "google",
          available: providers.google, language: "ur-PK", recommendedForUrdu: true },
        { id: "ur-PK-Standard-B", label: "Google Urdu (Male)",   provider: "google",
          available: providers.google, language: "ur-PK", recommendedForUrdu: true },
        { id: "21m00Tcm4TlvDq8ikWAM", label: "ElevenLabs Rachel (Multilingual)",
          provider: "elevenlabs", available: providers.elevenlabs,
          language: "multilingual", recommendedForUrdu: true },
        { id: "gtts-ur", label: "gTTS Urdu (offline fallback)", provider: "gtts",
          available: true, language: "ur", recommendedForUrdu: false },
      ];

      return res.json({
        success: true,
        providers,
        defaultVoice: "ur-PK-AsadNeural",
        voices,
      });
    } catch (err) {
      console.error("[TTS] listVoices failed:", err);
      return res.status(500).json({ success: false, message: "Unable to list voices." });
    }
  }

  /**
   * POST /api/tts  (legacy binary endpoint — used by the older PoetryPlayer hook).
   */
  static async tts(req, res) {
    try {
      const { text, voiceId, mode = "poetry", provider = "auto", speed = 1 } = req.body;
      const cleaned = sanitizeText(text);
      if (!cleaned) {
        return res.status(400).json({ success: false, message: "text is required." });
      }
      if (cleaned.length > 8000) {
        return res.status(400).json({ success: false, message: "Text exceeds 8000-character limit." });
      }

      const { buffer } = await synthesizeSpeech({
        text: cleaned,
        mode: mode === "normal" ? "normal" : "poetry",
        voice: voiceId,
        speed: clampSpeed(speed),
        preferredProvider: provider,
      });

      res.setHeader("Content-Type",        "audio/mpeg");
      res.setHeader("Content-Disposition", "inline; filename=recitation.mp3");
      res.setHeader("Cache-Control",       "no-store");
      res.setHeader("Content-Length",      buffer.length);
      return res.status(200).send(buffer);
    } catch (err) {
      console.error("[TTS] legacy tts failed:", err);
      return res.status(500).json({ success: false, message: err.message || "TTS failed." });
    }
  }

  /** Legacy alias for POST /api/tts/generate as a binary stream. */
  static async generateRecitation(req, res) {
    return TTSController.tts(req, res);
  }

  /** Legacy alias — delegate to the new JSON generator. */
  static async synthesizeRecitation(req, res) {
    return TTSController.generate(req, res);
  }

  /** POST /api/tts/download — force an MP3 attachment. */
  static async downloadRecitation(req, res) {
    try {
      const { text, mode = "poetry", voice, speed = 1, provider = "auto" } = req.body;
      const cleaned = sanitizeText(text);
      if (!cleaned) {
        return res.status(400).json({ success: false, message: "text is required." });
      }

      const { buffer } = await synthesizeSpeech({
        text: cleaned,
        mode: mode === "normal" ? "normal" : "poetry",
        voice,
        speed: clampSpeed(speed),
        preferredProvider: provider,
      });

      const fileName = `recitation_${Date.now()}.mp3`;
      res.setHeader("Content-Type",        "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length",      buffer.length);
      return res.status(200).send(buffer);
    } catch (err) {
      console.error("[TTS] download failed:", err);
      return res.status(500).json({ success: false, message: err.message || "Download failed." });
    }
  }
}

export default TTSController;
