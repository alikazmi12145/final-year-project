

import { chatGPT, isOpenAIConfigured } from "../utils/openaiClient.js";

// GPT-4o powered text analysis. Falls back to a passthrough object when AI unavailable.
export const analyzeText = async (text) => {
  const input = (text || "").toString().trim();
  if (!input || !isOpenAIConfigured()) {
    return {
      success: true,
      cleanedText: input,
      isPoetry: false,
      poetryForm: "unknown",
      themes: [],
      emotions: [],
      suggestedPoets: [],
      searchKeywords: input ? [input] : [],
      originalText: input,
      fallback: true,
    };
  }

  const result = await chatGPT({
    system:
      "You analyze Urdu/English text snippets to determine whether they are poetry and extract meaningful search signals. Respond JSON only.",
    user: `Analyze this text: "${input}"\n\nReturn JSON: { isPoetry (boolean), poetryForm ("ghazal"|"nazm"|"rubai"|"unknown"), themes (array of Urdu words), emotions (array of Urdu words), suggestedPoets (array of Urdu poet names like \u063a\u0627\u0644\u0628, \u0627\u0642\u0628\u0627\u0644), searchKeywords (array, max 6), cleanedText (string) }.`,
    json: true,
    temperature: 0.4,
    maxTokens: 500,
  });

  if (!result || typeof result !== "object") {
    return {
      success: true,
      cleanedText: input,
      isPoetry: false,
      poetryForm: "unknown",
      themes: [],
      emotions: [],
      suggestedPoets: [],
      searchKeywords: [input],
      originalText: input,
      fallback: true,
    };
  }

  return {
    success: true,
    cleanedText: result.cleanedText || input,
    isPoetry: Boolean(result.isPoetry),
    poetryForm: result.poetryForm || "unknown",
    themes: Array.isArray(result.themes) ? result.themes : [],
    emotions: Array.isArray(result.emotions) ? result.emotions : [],
    suggestedPoets: Array.isArray(result.suggestedPoets) ? result.suggestedPoets : [],
    searchKeywords: Array.isArray(result.searchKeywords) ? result.searchKeywords : [input],
    originalText: input,
    fallback: false,
  };
};

/**
 * Generate contextual search suggestions
 * @param {string} partialQuery - Partial search query
 * @returns {array} - Array of suggestions
 */
export const generateSmartSuggestions = async (partialQuery) => {
  const q = (partialQuery || "").toString().trim();
  const FALLBACK = [
    "غزلیات",
    "اقبال کی شاعری",
    "فیض کا کلام",
    "عشقیہ شاعری",
    "درد بھرے اشعار",
    "فطرت نگاری",
    "مقبول شعراء",
    "نظم کے موضوعات",
  ];

  if (!q || !isOpenAIConfigured()) {
    return { success: true, suggestions: FALLBACK, fallback: true };
  }

  const result = await chatGPT({
    system:
      "You generate short Urdu search suggestions for an Urdu poetry website. Respond JSON only.",
    user: `User typed: "${q}".\nReturn JSON: { "suggestions": [up to 8 short Urdu search phrases related to this query, each 1-4 words, no English] }`,
    json: true,
    temperature: 0.6,
    maxTokens: 250,
  });

  if (!result || !Array.isArray(result.suggestions) || result.suggestions.length === 0) {
    return { success: true, suggestions: FALLBACK, fallback: true };
  }
  return { success: true, suggestions: result.suggestions.slice(0, 8), fallback: false };
};

/**
 * Improve voice transcription using context
 * @param {string} transcription - Voice transcription result
 * @param {number} confidence - Confidence score
 * @returns {object} - Improved transcription
 */
export const improveVoiceTranscription = async (transcription, confidence) => {
  // Clean up common OCR/transcription errors
  let cleanedText = transcription
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .trim();

  // Detect poet from text
  const poetPatterns = {
    "ghalib": /غالب|ghalib|mirza|میرزا/i,
    "iqbal": /اقبال|iqbal|allama|علامہ/i,
    "faiz": /فیض|faiz|ahmad|احمد/i,
  };

  let detectedPoet = null;
  for (const [poet, pattern] of Object.entries(poetPatterns)) {
    if (pattern.test(cleanedText)) {
      detectedPoet = poet;
      break;
    }
  }

  if (confidence > 0.8) {
    return {
      success: true,
      improvedText: cleanedText,
      originalText: transcription,
      confidence: confidence,
      detectedPoet: detectedPoet,
    };
  }

  // OpenAI API removed. All AI features are disabled. Use fallback logic only.
  return {
    success: true,
    improvedText: cleanedText,
    originalText: transcription,
    confidence: confidence,
    detectedPoet: detectedPoet,
    corrections: [],
    fallback: true,
  };
};


// No default export needed, only named exports
