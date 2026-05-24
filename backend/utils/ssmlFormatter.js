import { splitPoetryLines, bundleShortLines } from "./textNormalizer.js";

/**
 * SSML escape for the limited subset of XML special characters that break
 * Google / Azure / AWS Polly SSML parsers.
 */
const escapeSsml = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Convert raw Urdu poetry into expressive SSML for Google Cloud TTS.
 *
 *  - 400 ms pauses between every verse (line)
 *  - 700 ms pauses between couplets (every 2 lines)
 *  - Soft prosody (slightly lower pitch, slower rate) for poetry mode
 *  - Each line is wrapped in <s> so the engine treats it as one sentence
 */
export const buildPoetrySSML = (text, { speed = 0.92, pitch = "-1st" } = {}) => {
  const lines = bundleShortLines(splitPoetryLines(text), 6);
  if (!lines.length) return `<speak>${escapeSsml(text)}</speak>`;

  const safeRate = Math.max(0.5, Math.min(1.5, Number(speed) || 0.92));

  const body = lines
    .map((line, idx) => {
      const verseBreak = `<break time="${idx % 2 === 1 ? 700 : 400}ms"/>`;
      return `<s>${escapeSsml(line)}</s>${verseBreak}`;
    })
    .join("");

  return `<speak><prosody rate="${safeRate}" pitch="${pitch}">${body}</prosody></speak>`;
};

/**
 * Simple SSML wrapper used for "normal" (non-poetic) mode. Only sentence
 * boundaries get a small pause; speaking rate stays close to natural.
 */
export const buildNormalSSML = (text, { speed = 1 } = {}) => {
  const safeRate = Math.max(0.5, Math.min(2, Number(speed) || 1));
  return `<speak><prosody rate="${safeRate}">${escapeSsml(text)}</prosody></speak>`;
};

/**
 * Split very long SSML into TTS-engine-safe chunks (Google's REST limit is
 * 5000 bytes of SSML per request).
 */
export const splitSSMLForChunking = (text, maxChars = 4500) => {
  const lines = splitPoetryLines(text);
  const chunks = [];
  let buffer = [];
  let length = 0;

  for (const line of lines) {
    if (length + line.length > maxChars && buffer.length) {
      chunks.push(buffer.join("\n"));
      buffer = [];
      length = 0;
    }
    buffer.push(line);
    length += line.length + 1;
  }
  if (buffer.length) chunks.push(buffer.join("\n"));
  return chunks.length ? chunks : [text];
};
