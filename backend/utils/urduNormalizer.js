/**
 * urduNormalizer.js
 * Lightweight Urdu / Arabic text normalization for plagiarism comparison.
 *
 * Steps:
 *   1. Strip diacritics (Aerab/Harakat)
 *   2. Unify visually-identical alif / yeh / heh variants
 *   3. Remove tatweel / kashida
 *   4. Collapse all punctuation & whitespace
 *   5. Lowercase any Latin fallthrough
 */

// Arabic / Urdu diacritic range (Fatha, Damma, Kasra, Sukun, Shadda, Tanwin…)
const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;

// Variant character map → canonical form
const CHAR_MAP = {
  // Alif variants → ا
  "\u0622": "\u0627", // آ → ا
  "\u0623": "\u0627", // أ → ا
  "\u0625": "\u0627", // إ → ا
  "\u0671": "\u0627", // ٱ → ا
  // Yeh variants → ی
  "\u064A": "\u06CC", // ي → ی
  "\u0649": "\u06CC", // ى → ی
  // Heh variants → ہ
  "\u0647": "\u06C1", // ه → ہ
  "\u06BE": "\u06C1", // ھ stays as is? Keep dochashmi separately. Map to ہ for matching.
  // Kaf variants → ک
  "\u0643": "\u06A9", // ك → ک
  // Hamza forms → drop
  "\u0621": "",
  "\u0624": "\u0648",
  "\u0626": "\u06CC",
  // Common punctuation
  "\u060C": " ", // Arabic comma
  "\u061B": " ", // Arabic semicolon
  "\u061F": " ", // Arabic question mark
};

const PUNCT = /[\p{P}\p{S}]/gu;
const WHITESPACE = /\s+/g;

export function normalizeUrdu(input = "") {
  if (!input || typeof input !== "string") return "";
  let s = input;

  // Replace variant chars
  s = s.replace(/[\u0622\u0623\u0625\u0671\u064A\u0649\u0647\u06BE\u0643\u0621\u0624\u0626\u060C\u061B\u061F]/g, (ch) =>
    CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : ch
  );

  // Remove diacritics
  s = s.replace(DIACRITICS, "");

  // Strip punctuation
  s = s.replace(PUNCT, " ");

  // Collapse whitespace + lowercase Latin
  s = s.replace(WHITESPACE, " ").trim().toLowerCase();

  return s;
}

/** Tokenize normalized text into word array. */
export function tokenize(input = "") {
  const n = normalizeUrdu(input);
  return n ? n.split(" ").filter(Boolean) : [];
}

/** Generate n-grams (default trigrams) from token array. */
export function ngrams(tokens, n = 3) {
  if (!Array.isArray(tokens) || tokens.length < n) return [];
  const out = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export default { normalizeUrdu, tokenize, ngrams };
