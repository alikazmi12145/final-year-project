/**
 * ttsService.js
 *
 * Provider abstraction over Urdu Text-to-Speech engines.
 * Selection priority (best → worst quality):
 *
 *   1. Google Cloud TTS      (preferred — needs @google-cloud/text-to-speech
 *                             + GOOGLE_APPLICATION_CREDENTIALS or
 *                             GOOGLE_TTS_KEY_JSON env var)
 *   2. ElevenLabs            (needs ELEVENLABS_API_KEY)
 *   3. Microsoft Edge TTS    (FREE neural voices via msedge-tts — DEFAULT
 *                             when no paid provider is configured. Voices:
 *                             ur-PK-AsadNeural, ur-PK-UzmaNeural,
 *                             ur-IN-GulNeural, ur-IN-SalmanNeural)
 *   4. gTTS (npm)            (last-ditch fallback if Edge endpoint is
 *                             unreachable; concatenation-prone)
 *
 * The service always returns a single MP3 Buffer plus the resolved
 * provider/voice it actually used, so the controller can persist a
 * deterministic record in MongoDB.
 */

import gTTS from "gtts";
import fs from "fs";
import path from "path";
import os from "os";
import { buildPoetrySSML, buildNormalSSML, splitSSMLForChunking } from "../utils/ssmlFormatter.js";
import { containsUrdu, sanitizeText } from "../utils/textNormalizer.js";

// ── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_DEFAULT_VOICE = process.env.GOOGLE_TTS_VOICE || "ur-PK-Standard-A";
const GOOGLE_DEFAULT_GENDER = process.env.GOOGLE_TTS_GENDER || "FEMALE";

const ELEVENLABS_DEFAULT_VOICE = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

const EDGE_DEFAULT_VOICE = process.env.EDGE_TTS_VOICE || "ur-PK-AsadNeural";
const EDGE_VOICE_ALIASES = {
  // Friendly aliases / ElevenLabs IDs → Edge voice mapping so older clients
  // that send things like "Rachel" still work seamlessly.
  Rachel: "ur-PK-UzmaNeural",
  Bella:  "ur-PK-UzmaNeural",
  Elli:   "ur-PK-UzmaNeural",
  Adam:   "ur-PK-AsadNeural",
  Antoni: "ur-PK-AsadNeural",
  Arnold: "ur-PK-AsadNeural",
  Josh:   "ur-PK-AsadNeural",
  Sam:    "ur-PK-AsadNeural",
  female: "ur-PK-UzmaNeural",
  male:   "ur-PK-AsadNeural",
  "21m00Tcm4TlvDq8ikWAM": "ur-PK-UzmaNeural",
};

const resolveEdgeVoice = (voice) => {
  if (!voice) return EDGE_DEFAULT_VOICE;
  if (/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice)) return voice;
  return EDGE_VOICE_ALIASES[voice] || EDGE_DEFAULT_VOICE;
};

// ── Google Cloud TTS (lazy loaded) ───────────────────────────────────────────

let cachedGoogleClient = null;

const loadGoogleClient = async () => {
  if (cachedGoogleClient) return cachedGoogleClient;

  let TextToSpeechClient;
  try {
    ({ TextToSpeechClient } = await import("@google-cloud/text-to-speech"));
  } catch {
    return null; // package not installed → silently disable provider
  }

  try {
    // Option 1: inline JSON credentials via env var (great for hosting)
    const inline = process.env.GOOGLE_TTS_KEY_JSON;
    if (inline) {
      const parsed = JSON.parse(inline);
      cachedGoogleClient = new TextToSpeechClient({ credentials: parsed });
      return cachedGoogleClient;
    }

    // Option 2: classic GOOGLE_APPLICATION_CREDENTIALS file path
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      cachedGoogleClient = new TextToSpeechClient();
      return cachedGoogleClient;
    }
  } catch (err) {
    console.warn("[TTS] Google credentials invalid:", err.message);
  }
  return null;
};

const synthesizeWithGoogle = async ({ text, mode, voice, speed, language }) => {
  const client = await loadGoogleClient();
  if (!client) return null;

  const ssmlSpeed = mode === "poetry" ? Math.min(speed, 0.95) : speed;
  const ssmlBuilder = mode === "poetry" ? buildPoetrySSML : buildNormalSSML;

  // Chunk to stay below the 5000-byte SSML limit for the REST API.
  const chunks = splitSSMLForChunking(text, 3500);
  const audioBuffers = [];

  for (const chunk of chunks) {
    const ssml = ssmlBuilder(chunk, { speed: ssmlSpeed });
    const [response] = await client.synthesizeSpeech({
      input:       { ssml },
      voice:       { languageCode: language || "ur-PK", name: voice, ssmlGender: GOOGLE_DEFAULT_GENDER },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: mode === "poetry" ? Math.min(1, speed * 0.95) : speed,
        pitch: mode === "poetry" ? -1 : 0,
        effectsProfileId: ["headphone-class-device"],
      },
    });

    if (response?.audioContent) {
      audioBuffers.push(Buffer.from(response.audioContent, "binary"));
    }
  }

  if (!audioBuffers.length) return null;

  return {
    buffer:   Buffer.concat(audioBuffers),
    provider: "google",
    voice:    voice || GOOGLE_DEFAULT_VOICE,
  };
};

// ── ElevenLabs ───────────────────────────────────────────────────────────────

const synthesizeWithElevenLabs = async ({ text, voice }) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = (voice || ELEVENLABS_DEFAULT_VOICE).toString().trim();

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method:  "POST",
      headers: {
        "xi-api-key":   apiKey,
        "Content-Type": "application/json",
        Accept:         "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id:       ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) throw new Error("ElevenLabs returned empty audio.");

  return { buffer, provider: "elevenlabs", voice: voiceId };
};

// ── Microsoft Edge TTS (free neural voices, primary default) ─────────────────
//
// Uses the public Edge "read aloud" endpoint via msedge-tts. Returns ONE
// continuous MP3 stream (no concatenation problems) and supports SSML for
// our poetry pauses.
//

let cachedEdgeModule = null;
const loadEdgeModule = async () => {
  if (cachedEdgeModule) return cachedEdgeModule;
  try {
    cachedEdgeModule = await import("msedge-tts");
    return cachedEdgeModule;
  } catch (err) {
    console.warn("[TTS] msedge-tts unavailable:", err.message);
    return null;
  }
};

const synthesizeWithEdge = async ({ text, mode, voice, speed, language }) => {
  const mod = await loadEdgeModule();
  if (!mod) return null;

  const { MsEdgeTTS, OUTPUT_FORMAT } = mod;
  const resolvedVoice = resolveEdgeVoice(voice);

  // ── Rate ────────────────────────────────────────────────────────────────
  // Map 0.5–2.0 → ±N% rate (Edge accepts "-15%", "+20%", etc.)
  const safeSpeed = Math.max(0.5, Math.min(2, Number(speed) || 1));
  // For poetry slow the cadence to a measured tarannum pace, unless the user
  // explicitly asked for something even slower.
  const baseSpeed = mode === "poetry" ? Math.min(safeSpeed, 0.95) : safeSpeed;
  const ratePct = Math.round((baseSpeed - 1) * 100);
  const rateStr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
  const pitchStr = mode === "poetry" ? "-2st" : "+0Hz";

  // Build the input. Edge auto-wraps it in <speak><voice><prosody>…</prosody></voice></speak>
  // and SILENTLY rejects requests that contain inline SSML tags such as
  // <break/>, so we cannot splice those in. Instead, we use natural Urdu
  // punctuation cues that the neural voice already respects:
  //   ، (U+060C)    short caesura  (~250 ms)  — mid-line / qaafiya
  //   ۔ (U+06D4)    full pause     (~650 ms)  — end of misra-e-oola
  //   ۔۔۔ (triple)  long pause     (~1.1 s)   — end of sher (couplet)
  //   blank line    breath pause   (~400 ms)  — between ash'aar
  let input;
  if (mode === "poetry") {
    const lines = text
      .replace(/\r/g, "")
      .split(/\n+/)
      .map((l) => l.trim().replace(/[۔،,.…]+$/u, ""))
      .filter(Boolean);

    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const isMisraSaani = (i + 1) % 2 === 0; // 2nd line of the sher
      out.push(`${lines[i]}${isMisraSaani ? "۔۔۔" : "۔"}`);
      if (isMisraSaani && i < lines.length - 1) out.push(""); // breath
    }
    input = out.join("\n");
  } else {
    input = text;
  }
  input = escapeXml(input);

  // ── One-shot stream synthesis with 30 s timeout ────────────────────────
  const callEdgeOnce = async () => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(resolvedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const stream = tts.toStream(input, { rate: rateStr, pitch: pitchStr, volume: "+0%" });
    const audioStream = stream.audioStream || stream;
    const chunks = [];

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Edge TTS timeout (30s)")), 30000);
        audioStream.on("data",  (c) => chunks.push(c));
        audioStream.on("end",   () => { clearTimeout(timer); resolve(); });
        audioStream.on("close", () => { clearTimeout(timer); resolve(); });
        audioStream.on("error", (e) => { clearTimeout(timer); reject(e); });
      });
    } finally {
      try { tts.close?.(); } catch { /* noop */ }
    }

    const buffer = Buffer.concat(chunks);
    if (!buffer.length) throw new Error("Edge TTS returned empty audio.");
    return buffer;
  };

  // One quick retry on transient WebSocket / timeout errors — they happen
  // when the public Edge endpoint gets stressed.
  let buffer;
  try {
    buffer = await callEdgeOnce();
  } catch (err) {
    console.warn(`[TTS] Edge first attempt failed (${err.message}); retrying once…`);
    await new Promise((r) => setTimeout(r, 600));
    buffer = await callEdgeOnce();
  }

  // Suppress unused-var warning while keeping the param for API parity
  void language;

  return { buffer, provider: "edge", voice: resolvedVoice };
};

const escapeXml = (s = "") =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// ── gTTS final fallback ──────────────────────────────────────────────────────
//
// IMPORTANT:
//   The npm `gtts` package wraps Google Translate's unofficial TTS endpoint,
//   which silently truncates a single request at ~200 characters. Multi-line
//   Urdu poetry therefore comes back as a tiny ~3-second clip if we just hand
//   it the whole text. We work around this by chunking on poetry line / Urdu
//   sentence boundaries (≤180 chars per chunk), synthesising each separately
//   and concatenating the resulting MP3 buffers (raw MP3 concat is valid —
//   players treat consecutive MPEG frames as one stream).
//

const GTTS_CHUNK_LIMIT = 180;

/**
 * Split text into ≤GTTS_CHUNK_LIMIT chunks, preferring breaks at line ends,
 * Urdu full-stops (۔), commas, question marks, then spaces.
 */
const chunkForGTTS = (text) => {
  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return [];

  // First split by hard line breaks — natural couplet boundaries for poetry.
  const lines = cleaned.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const chunks = [];

  for (const line of lines) {
    if (line.length <= GTTS_CHUNK_LIMIT) { chunks.push(line); continue; }

    // Long line → break on Urdu/ASCII sentence punctuation, then on spaces.
    const pieces = line.split(/(?<=[۔.!?،,])\s+/);
    let current = "";
    for (const piece of pieces) {
      if ((current + " " + piece).trim().length > GTTS_CHUNK_LIMIT) {
        if (current) chunks.push(current.trim());
        if (piece.length > GTTS_CHUNK_LIMIT) {
          // Pathological: split by words.
          const words = piece.split(/\s+/);
          let w = "";
          for (const word of words) {
            if ((w + " " + word).trim().length > GTTS_CHUNK_LIMIT) {
              if (w) chunks.push(w.trim());
              w = word;
            } else {
              w = (w + " " + word).trim();
            }
          }
          if (w) current = w;
          else current = "";
        } else {
          current = piece;
        }
      } else {
        current = (current + " " + piece).trim();
      }
    }
    if (current) chunks.push(current.trim());
  }
  return chunks.filter(Boolean);
};

const writeGTTSChunk = (text, lang, filePath, slow = false) =>
  new Promise((resolve, reject) => {
    try {
      const tts = new gTTS(text, lang, slow);
      tts.save(filePath, (err) => (err ? reject(err) : resolve(filePath)));
    } catch (err) {
      reject(err);
    }
  });

const synthesizeWithGTTS = async ({ text, speed, mode }) => {
  const tmpDir = path.join(os.tmpdir(), "bazm-tts");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  const isUrdu = containsUrdu(text);
  // gTTS slow-mode gives a more recitation-like cadence — use it for poetry
  // OR when the user explicitly asked for speed < 0.9.
  const slow = mode === "poetry" || (Number(speed) || 1) < 0.9;

  // Pick the best language code. Urdu first, fall back to Hindi (very close
  // phonetically) and finally English.
  const candidateLangs = isUrdu ? ["ur", "hi", "en"] : ["en"];

  const chunks = chunkForGTTS(text);
  if (!chunks.length) throw new Error("gTTS: no synthesisable chunks.");

  let workingLang = null;
  const buffers = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const tmpFile = path.join(
      tmpDir,
      `gtts_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.mp3`
    );

    let saved = false;
    // Pick a language for the first chunk, then reuse it for the rest so the
    // voice does not switch mid-poem.
    const langsToTry = workingLang ? [workingLang] : candidateLangs;

    for (const lang of langsToTry) {
      try {
        await writeGTTSChunk(chunks[i], lang, tmpFile, slow);
        workingLang = lang;
        saved = true;
        break;
      } catch (err) {
        // Try next candidate language only on first chunk
        if (workingLang) throw err;
        console.warn(`[TTS] gTTS lang "${lang}" failed →`, err.message);
      }
    }
    if (!saved) throw new Error("gTTS: all language candidates failed.");

    const buf = await fs.promises.readFile(tmpFile);
    await fs.promises.unlink(tmpFile).catch(() => {});
    if (buf.length) buffers.push(buf);
  }

  if (!buffers.length) throw new Error("gTTS produced no audio.");

  return {
    buffer:   Buffer.concat(buffers),
    provider: "gtts",
    voice:    `gtts-${workingLang || "ur"}`,
  };
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate an MP3 buffer for the given Urdu poetry text.
 *
 * @param {Object} params
 * @param {string} params.text       - Cleaned (sanitised) text.
 * @param {"poetry"|"normal"} params.mode
 * @param {string} [params.voice]    - Provider-specific voice ID.
 * @param {number} [params.speed]    - 0.5–2.
 * @param {string} [params.language] - BCP-47, default ur-PK.
 * @param {string} [params.preferredProvider] - "google" | "elevenlabs" | "gtts" | "auto"
 *
 * @returns {Promise<{buffer:Buffer, provider:string, voice:string}>}
 */
export const synthesizeSpeech = async ({
  text,
  mode = "poetry",
  voice,
  speed = 1,
  language = "ur-PK",
  preferredProvider = "auto",
}) => {
  const cleaned = sanitizeText(text);
  if (!cleaned) throw new Error("Cannot synthesise empty text.");

  const order = (() => {
    switch (preferredProvider) {
      case "google":     return ["google", "elevenlabs", "edge", "gtts"];
      case "elevenlabs": return ["elevenlabs", "google", "edge", "gtts"];
      case "edge":       return ["edge", "gtts"];
      case "gtts":       return ["gtts", "edge"];
      default:           return ["google", "elevenlabs", "edge", "gtts"];
    }
  })();

  const errors = [];

  for (const provider of order) {
    try {
      let result = null;

      if (provider === "google") {
        result = await synthesizeWithGoogle({
          text: cleaned, mode, voice: voice || GOOGLE_DEFAULT_VOICE, speed, language,
        });
      } else if (provider === "elevenlabs") {
        result = await synthesizeWithElevenLabs({ text: cleaned, voice });
      } else if (provider === "edge") {
        result = await synthesizeWithEdge({
          text: cleaned, mode, voice, speed, language,
        });
      } else if (provider === "gtts") {
        result = await synthesizeWithGTTS({ text: cleaned, speed, mode });
      }

      if (result?.buffer?.length) return result;
    } catch (err) {
      errors.push(`${provider}: ${err.message}`);
      console.warn(`[TTS] provider "${provider}" failed →`, err.message);
    }
  }

  const detail = errors.length ? ` (${errors.join(" | ")})` : "";
  throw new Error(`All TTS providers failed${detail}`);
};

/** Lightweight introspection used by the /voices endpoint. */
export const listAvailableProviders = async () => ({
  google:     Boolean(await loadGoogleClient()),
  elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  edge:       Boolean(await loadEdgeModule()),
  gtts:       true,
});

/** Static list of recommended Urdu neural voices for the UI dropdown. */
export const EDGE_URDU_VOICES = [
  { id: "ur-PK-AsadNeural", label: "Asad (Pakistan, Male)",   gender: "male",   locale: "ur-PK" },
  { id: "ur-PK-UzmaNeural", label: "Uzma (Pakistan, Female)", gender: "female", locale: "ur-PK" },
  { id: "ur-IN-SalmanNeural", label: "Salman (India, Male)",  gender: "male",   locale: "ur-IN" },
  { id: "ur-IN-GulNeural",    label: "Gul (India, Female)",   gender: "female", locale: "ur-IN" },
];
