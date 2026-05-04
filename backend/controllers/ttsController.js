import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import gTTS from "gtts";
import { generateSpeech } from "../services/aiSearchService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.join(__dirname, "..");
const TEMP_DIR = path.join(BACKEND_ROOT, "uploads", "tts-temp");
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
const DEFAULT_VOICE = "onyx";
const GTTS_PRIMARY_URDU_FALLBACK = "ur";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

const ensureTempDir = async () => {
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });
};

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const containsUrdu = (text = "") => /[\u0600-\u06FF]/.test(text);

const sanitizeText = (text = "") => {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const clampSpeed = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(2, Math.max(0.5, parsed));
};

const normalizeVoice = (voice) => {
  const candidate = (voice || "").toString().trim().toLowerCase();
  return OPENAI_VOICES.includes(candidate) ? candidate : DEFAULT_VOICE;
};

const normalizeProvider = (provider) => {
  const value = (provider || "").toString().trim().toLowerCase();
  if (value === "gtts") {
    return "gtts";
  }
  return "ai";
};

const getRequestBaseUrl = (req) => {
  const protocol = req.protocol || "http";
  const host = req.get("host");
  return `${protocol}://${host}`;
};

const toPublicAudioPath = (filePath) => {
  const relative = path.relative(BACKEND_ROOT, filePath);
  if (!relative || relative.startsWith("..")) {
    return null;
  }
  return `/${relative.split(path.sep).join("/")}`;
};

const resolveGTTSLanguageCode = (languageCode) => {
  // Use native Urdu voice; fall back to Hindi if Google TTS rejects "ur"
  // ("hi" is a last-resort approximation that shares vocabulary with Urdu)
  if (languageCode === "ur") {
    return GTTS_PRIMARY_URDU_FALLBACK; // "ur"
  }
  return languageCode;
};

const writeTTSFile = (text, languageCode, filePath, slowMode = false) => {
  return new Promise((resolve, reject) => {
    try {
      const tts = new gTTS(text, languageCode, slowMode);
      tts.save(filePath, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(filePath);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const removeFileQuietly = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore cleanup failures.
  }
};

const createGTTSFile = async ({ text, languageCode, speed }) => {
  await ensureTempDir();

  const fileName = `recitation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
  const filePath = path.join(TEMP_DIR, fileName);
  const slowMode = speed < 0.9;
  const gttsLanguage = resolveGTTSLanguageCode(languageCode);

  try {
    await writeTTSFile(text, gttsLanguage, filePath, slowMode);
  } catch (error) {
    // "ur" (native Urdu) failed → try Hindi approximation before English
    if (gttsLanguage === "ur") {
      try {
        await writeTTSFile(text, "hi", filePath, slowMode);
      } catch {
        await writeTTSFile(text, "en", filePath, slowMode);
      }
    } else if (gttsLanguage !== "en") {
      await writeTTSFile(text, "en", filePath, slowMode);
    } else {
      throw error;
    }
  }

  return {
    filePath,
    publicPath: toPublicAudioPath(filePath),
    provider: "gtts",
    voice: gttsLanguage === "hi" ? "gtts-hi" : "gtts-en",
    fallback: true,
    message:
      languageCode === "ur"
        ? "AI Urdu voice unavailable. Generated audio using closest available fallback voice."
        : "AI voice unavailable. Generated audio using fallback voice.",
  };
};

const createSpeechFile = async ({ text, language, speed, provider, voice }) => {
  const wantsUrdu = language === "ur" || (language === "auto" && containsUrdu(text));
  const languageCode = wantsUrdu ? "ur" : "en";
  const normalizedSpeed = clampSpeed(speed);
  const preferredProvider = normalizeProvider(provider);
  const normalizedVoice = normalizeVoice(voice);

  if (preferredProvider === "ai" && process.env.OPENAI_API_KEY) {
    try {
      const aiResult = await generateSpeech(text, {
        voice: normalizedVoice,
        speed: normalizedSpeed,
      });

      if (aiResult?.success && aiResult.path) {
        const normalizedPath = aiResult.path.replace(/^\/+/, "");
        const filePath = path.join(BACKEND_ROOT, normalizedPath);
        const publicPath = aiResult.path.startsWith("/") ? aiResult.path : `/${normalizedPath}`;

        await ensureDir(path.dirname(filePath));

        return {
          filePath,
          publicPath,
          provider: "ai",
          voice: aiResult.voice || normalizedVoice,
          fallback: false,
          message: "",
        };
      }
    } catch (aiError) {
      console.error("AI speech synthesis failed. Falling back to gTTS:", aiError.message);
    }
  }

  return createGTTSFile({
    text,
    languageCode,
    speed: normalizedSpeed,
  });
};

const generateElevenLabsAudioBuffer = async ({ text, voiceId }) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    const missingKeyError = new Error("ELEVENLABS_API_KEY is not configured on the server.");
    missingKeyError.httpStatus = 500;
    throw missingKeyError;
  }

  const resolvedVoiceId = (voiceId || DEFAULT_ELEVENLABS_VOICE_ID).toString().trim();
  if (!resolvedVoiceId) {
    const invalidVoiceError = new Error("A valid ElevenLabs voiceId is required.");
    invalidVoiceError.httpStatus = 400;
    throw invalidVoiceError;
  }

  const requestPayload = {
    text,
    model_id: "eleven_multilingual_v3",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };

  const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${resolvedVoiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    let providerError = `ElevenLabs request failed (${response.status}).`;
    try {
      const errorText = await response.text();
      if (errorText) {
        providerError = errorText;
      }
    } catch {
      // Keep fallback provider error message.
    }

    const wrappedError = new Error(providerError);
    wrappedError.providerStatus = response.status;
    wrappedError.httpStatus = response.status >= 500 ? 502 : 400;
    throw wrappedError;
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  if (!audioBuffer.length) {
    const emptyAudioError = new Error("ElevenLabs returned an empty audio response.");
    emptyAudioError.httpStatus = 502;
    throw emptyAudioError;
  }

  return audioBuffer;
};

class TTSController {
  static async generateRecitation(req, res) {
    try {
      const { text, voiceId = DEFAULT_ELEVENLABS_VOICE_ID } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          success: false,
          message: "Poetry text is required.",
        });
      }

      const cleanedText = sanitizeText(text);
      if (!cleanedText) {
        return res.status(400).json({
          success: false,
          message: "Please provide non-empty poetry text.",
        });
      }

      if (cleanedText.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Text is too long. Please keep it under 5000 characters.",
        });
      }

      // Try ElevenLabs only if key is set AND it hasn't previously returned a payment error.
      const apiKey = process.env.ELEVENLABS_API_KEY;
      const elevenLabsDisabled = process.env.ELEVENLABS_DISABLED === "true";
      if (apiKey && !elevenLabsDisabled) {
        try {
          const audioBuffer = await generateElevenLabsAudioBuffer({
            text: cleanedText,
            voiceId,
          });

          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Content-Disposition", "inline; filename=recitation.mp3");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Length", audioBuffer.length);
          return res.status(200).send(audioBuffer);
        } catch (elevenError) {
          const isPaymentError =
            elevenError.message.includes("payment_required") ||
            elevenError.message.includes("paid_plan_required");
          if (isPaymentError) {
            // Permanently disable ElevenLabs for this process to avoid repeated failed calls.
            process.env.ELEVENLABS_DISABLED = "true";
            console.warn("ElevenLabs free plan cannot use library voices. Disabled for this session — using gTTS.");
          } else {
            console.warn("ElevenLabs TTS failed:", elevenError.message);
          }
          // Fall through to gTTS below.
        }
      }

      // gTTS fallback (works without any paid API key)
      const wantsUrdu = containsUrdu(cleanedText);
      const gttsResult = await createGTTSFile({
        text: cleanedText,
        languageCode: wantsUrdu ? "ur" : "en",
        speed: 1,
      });

      const audioBytes = await fs.promises.readFile(gttsResult.filePath);
      removeFileQuietly(gttsResult.filePath);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", "inline; filename=recitation.mp3");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Length", audioBytes.length);
      return res.status(200).send(audioBytes);
    } catch (error) {
      console.error("TTS generate failed:", error);
      return res.status(error.httpStatus || 500).json({
        success: false,
        message: error.message || "Unable to generate recitation right now.",
      });
    }
  }

  static async listVoices(req, res) {
    const aiEnabled = Boolean(process.env.OPENAI_API_KEY);
    const voices = OPENAI_VOICES.map((voice) => ({
      id: voice,
      label: `AI ${voice[0].toUpperCase()}${voice.slice(1)}`,
      provider: "ai",
      available: aiEnabled,
      language: "multilingual",
      recommendedForUrdu: true,
    }));

    voices.push(
      {
        id: "gtts-hi",
        label: "Fallback Regional Voice",
        provider: "gtts",
        available: true,
        language: "hi",
        recommendedForUrdu: true,
      },
      {
        id: "gtts-en",
        label: "Fallback English Voice",
        provider: "gtts",
        available: true,
        language: "en",
        recommendedForUrdu: false,
      }
    );

    return res.json({
      success: true,
      aiEnabled,
      defaultVoice: DEFAULT_VOICE,
      voices,
    });
  }

  static async synthesizeRecitation(req, res) {
    try {
      const {
        text,
        language = "auto",
        speed = 1,
        provider = "ai",
        voice = DEFAULT_VOICE,
      } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          success: false,
          message: "Poetry text is required.",
        });
      }

      const cleanedText = sanitizeText(text);
      if (!cleanedText) {
        return res.status(400).json({
          success: false,
          message: "Please provide non-empty poetry text.",
        });
      }

      if (cleanedText.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Text is too long. Please keep it under 5000 characters.",
        });
      }

      const speechResult = await createSpeechFile({
        text: cleanedText,
        language,
        speed,
        provider,
        voice,
      });

      if (!speechResult.publicPath) {
        throw new Error("Generated audio path is not publicly accessible.");
      }

      return res.json({
        success: true,
        audioPath: speechResult.publicPath,
        audioUrl: `${getRequestBaseUrl(req)}${speechResult.publicPath}`,
        provider: speechResult.provider,
        voice: speechResult.voice,
        fallback: speechResult.fallback,
        message: speechResult.message,
      });
    } catch (error) {
      console.error("TTS synthesize failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to synthesize recitation right now. Please try again.",
      });
    }
  }

  static async downloadRecitation(req, res) {
    try {
      const {
        text,
        language = "auto",
        speed = 1,
        provider = "ai",
        voice = DEFAULT_VOICE,
      } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          success: false,
          message: "Poetry text is required.",
        });
      }

      const cleanedText = sanitizeText(text);
      if (!cleanedText) {
        return res.status(400).json({
          success: false,
          message: "Please provide non-empty poetry text.",
        });
      }

      if (cleanedText.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Text is too long. Please keep it under 5000 characters.",
        });
      }

      const speechResult = await createSpeechFile({
        text: cleanedText,
        language,
        speed,
        provider,
        voice,
      });

      const filePath = speechResult.filePath;
      const fileName = `recitation_${Date.now()}.mp3`;

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

      res.download(filePath, fileName, async (error) => {
        if (filePath.includes(`${path.sep}tts-temp${path.sep}`)) {
          await removeFileQuietly(filePath);
        }

        if (error && !res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Failed to stream generated MP3 file.",
          });
        }
      });
    } catch (error) {
      console.error("TTS download failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to generate recitation right now. Please try again.",
      });
    }
  }

  /**
   * POST /api/tts
   *
   * Clean ElevenLabs-first endpoint.
   *   - Accepts:  { text, voiceId? }
   *   - Returns:  audio/mpeg binary stream on success
   *               JSON { success: false, message } on error
   *
   * Unlike /api/tts/generate this endpoint does NOT silently fall back to
   * gTTS (which produces silent MP3 for Urdu text). Instead it returns a
   * clear error message so the frontend can display it to the user.
   */
  static async tts(req, res) {
    try {
      const { text, voiceId } = req.body;

      // ── Validate input ──────────────────────────────────────────────────────
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: "text is required and must be a non-empty string.",
        });
      }

      const cleanedText = sanitizeText(text);

      if (cleanedText.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Text exceeds 5 000-character limit.",
        });
      }

      // ── Ensure ElevenLabs API key exists ────────────────────────────────────
      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(503).json({
          success: false,
          message:
            "TTS service not configured. " +
            "Add ELEVENLABS_API_KEY=<your-key> to backend/.env and restart the server.",
        });
      }

      // ── Call ElevenLabs ─────────────────────────────────────────────────────
      const resolvedVoiceId = (voiceId || DEFAULT_ELEVENLABS_VOICE_ID).toString().trim();
      const audioBuffer = await generateElevenLabsAudioBuffer({
        text: cleanedText,
        voiceId: resolvedVoiceId,
      });

      // Debug log — check this in the backend terminal to confirm audio is real.
      console.log(
        `[TTS] ElevenLabs OK: ${audioBuffer.length} bytes` +
        ` | voice: ${resolvedVoiceId}` +
        ` | chars: ${cleanedText.length}`
      );

      if (!audioBuffer.length) {
        throw new Error("ElevenLabs returned an empty audio buffer.");
      }

      // ── Stream audio back to the client ─────────────────────────────────────
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", "inline; filename=recitation.mp3");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Length", audioBuffer.length);
      return res.status(200).send(audioBuffer);
    } catch (error) {
      console.error("[TTS] /api/tts failed:", error.message);
      return res.status(error.httpStatus || 500).json({
        success: false,
        message: error.message || "Unable to generate recitation right now.",
      });
    }
  }
}

export default TTSController;
