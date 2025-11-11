


// Fallback text analysis function
export const analyzeText = async (text) => {
  return {
    success: true,
    cleanedText: text,
    isPoetry: false,
    poetryForm: "unknown",
    themes: [],
    emotions: [],
    suggestedPoets: [],
    searchKeywords: [text],
    originalText: text,
  };
};

/**
 * Generate contextual search suggestions
 * @param {string} partialQuery - Partial search query
 * @returns {array} - Array of suggestions
 */
export const generateSmartSuggestions = async (partialQuery) => {
  // OpenAI API removed. All AI features are disabled. Use fallback logic only.
  return {
    success: true,
    suggestions: [
      "Ghazal classics",
      "Iqbal's poems",
      "Faiz's poetry",
      "Love poetry",
      "Sad verses",
      "Nature poems",
      "Popular poets",
      "Nazm topics",
    ],
    fallback: true,
  };
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
