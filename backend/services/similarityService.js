/**
 * similarityService.js
 * Lightweight in-process plagiarism / duplicate detection for Urdu poetry.
 *
 * Strategy:
 *   • Normalize both texts with urduNormalizer.
 *   • Generate trigram sets.
 *   • Compute Jaccard similarity = |A ∩ B| / |A ∪ B|.
 *
 * Returns a score in [0, 1]. Anything >= 0.65 is treated as a strong match
 * and >= 0.85 is auto-flagged.
 */
import Poem from "../models/Poem.js";
import { tokenize, ngrams, normalizeUrdu } from "../utils/urduNormalizer.js";

export const HIGH_SIMILARITY = 0.85;
export const SUSPICIOUS_SIMILARITY = 0.65;

function jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const item of setA) if (setB.has(item)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Compute similarity score between two raw texts.
 */
export function computeSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const a = new Set(ngrams(tokenize(textA), 3));
  const b = new Set(ngrams(tokenize(textB), 3));
  return jaccard(a, b);
}

/**
 * Scan a candidate poem against all published poems and find the closest match.
 * Used at poem creation time and at report time.
 *
 * @param {string} content        - Raw poem content
 * @param {string} [excludePoemId] - Optional poem id to exclude from comparison
 * @returns {Promise<{bestMatch: object|null, score: number, candidates: Array}>}
 */
export async function detectDuplicates(content, excludePoemId = null) {
  const normalized = normalizeUrdu(content);
  if (!normalized || normalized.length < 30) {
    return { bestMatch: null, score: 0, candidates: [] };
  }

  // Cheap pre-filter: use a few rare tokens to narrow candidates via $text search.
  const tokens = tokenize(content);
  if (!tokens.length) return { bestMatch: null, score: 0, candidates: [] };

  // Take a handful of distinctive tokens (longest first)
  const sample = [...new Set(tokens)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 6)
    .join(" ");

  const filter = {
    published: true,
    content: { $exists: true, $ne: "" },
  };
  if (excludePoemId) filter._id = { $ne: excludePoemId };

  let candidates = [];
  try {
    candidates = await Poem.find(
      { ...filter, $text: { $search: sample } },
      { title: 1, content: 1, author: 1, poet: 1 }
    )
      .limit(50)
      .lean();
  } catch {
    // Fallback if no text index hit
    candidates = await Poem.find(filter)
      .select("title content author poet")
      .limit(100)
      .lean();
  }

  let bestMatch = null;
  let best = 0;
  const scored = [];
  for (const c of candidates) {
    const s = computeSimilarity(content, c.content);
    if (s > 0) scored.push({ poemId: c._id, title: c.title, score: s });
    if (s > best) {
      best = s;
      bestMatch = c;
    }
  }
  scored.sort((a, b) => b.score - a.score);

  return { bestMatch, score: best, candidates: scored.slice(0, 5) };
}

export default { computeSimilarity, detectDuplicates, HIGH_SIMILARITY, SUSPICIOUS_SIMILARITY };
