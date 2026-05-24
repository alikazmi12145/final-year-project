/**
 * Urdu poetry text normalisation utilities.
 *
 * Normalisation is required because the same poem can arrive with mixed
 * whitespace, BOM characters, zero-width joiners, or trailing punctuation.
 * Two requests with semantically identical text MUST produce the same hash
 * so we can reuse a previously generated MP3.
 */

const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;
const MULTI_WHITESPACE_RE = /[ \t]+/g;
const MULTI_NEWLINE_RE = /\n{2,}/g;

/** True when text contains Arabic-script characters (Urdu / Arabic / Farsi). */
export const containsUrdu = (text = "") => /[\u0600-\u06FF]/.test(text);

/**
 * Light sanitiser used for display & for the original text stored in Mongo.
 * Trims each line, removes blank-only lines, normalises newlines.
 */
export const sanitizeText = (text = "") =>
  String(text)
    .replace(/\r\n?/g, "\n")
    .replace(ZERO_WIDTH_RE, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

/**
 * Deterministic normaliser used for hashing (dedup key).
 * Strips ALL formatting noise so the same poem reuses the same MP3.
 */
export const normalizeForHash = (text = "") =>
  sanitizeText(text)
    .toLowerCase()
    .replace(MULTI_WHITESPACE_RE, " ")
    .replace(MULTI_NEWLINE_RE, "\n")
    .replace(/[!?،,.:;۔]+$/gm, "")
    .trim();

/** Split a poem into trimmed non-empty lines. */
export const splitPoetryLines = (text = "") =>
  sanitizeText(text).split("\n").filter(Boolean);

/**
 * Merge very short lines (single word, refrain, etc.) into the next line so
 * that TTS engines voice them naturally instead of clipping them.
 */
export const bundleShortLines = (lines, minLen = 6) => {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].length < minLen && i + 1 < lines.length) {
      out.push(`${lines[i]} ${lines[i + 1]}`);
      i += 1;
    } else {
      out.push(lines[i]);
    }
  }
  return out;
};

/**
 * Estimate spoken duration in seconds.
 * Urdu poetry recitation averages ~10 chars / sec at normal rate; we adjust
 * for the chosen playback speed so the UI shows a sensible value even before
 * the audio element reports its real duration.
 */
export const estimateDurationSeconds = (text = "", speed = 1) => {
  const chars = sanitizeText(text).replace(/\s/g, "").length;
  const charsPerSecond = 10 * Math.max(0.5, Math.min(2, Number(speed) || 1));
  return Math.max(1, Math.round(chars / charsPerSecond));
};
