import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// Check if OpenAI API key is properly configured
const isOpenAIConfigured =
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !== "your-openai-api-key" &&
  process.env.OPENAI_API_KEY.length > 10;

const openai = isOpenAIConfigured
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 8000, // 8 second timeout
    })
  : null;

// Log configuration status
if (!isOpenAIConfigured) {
  console.warn(
    "⚠️  OpenAI API key not configured. AI features will be disabled."
  );
} else {
  console.log("✅ OpenAI API configured successfully");
}

/**
 * Enhance search query using ChatGPT
 * @param {string} query - Original search query
 * @param {string} language - Language of the query (urdu, english)
 * @returns {object} - Enhanced query with suggestions and translations
 */
export const enhanceSearchQuery = async (query, language = "urdu") => {
  // Return immediately if OpenAI is not configured
  if (!isOpenAIConfigured || !openai) {
    return {
      success: false,
      enhancedKeywords: [query],
      urduTranslation: query,
      relatedPoets: [],
      poetryForms: [],
      emotionalContext: [],
      semanticExpansion: [],
      originalQuery: query,
      reason: "OpenAI API not configured",
    };
  }

  try {
    const prompt = `
You are an expert in Urdu poetry and literature. Given this search query: "${query}"

Please provide:
1. Enhanced keywords (3-5 related terms)
2. If the query is in Roman Urdu or English, provide the Urdu translation
3. Related poets who might have written about this topic
4. Related poetry forms (ghazal, nazm, rubai, etc.)
5. Emotional context (romantic, sad, spiritual, etc.)

Respond in JSON format with classical Urdu poetry context:
{
  "enhancedKeywords": ["keyword1", "keyword2", "keyword3"],
  "urduTranslation": "اردو میں ترجمہ",
  "relatedPoets": ["poet1", "poet2"],
  "poetryForms": ["ghazal", "nazm"],
  "emotionalContext": ["romantic", "melancholic"],
  "semanticExpansion": ["related_concept1", "related_concept2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in classical Urdu poetry, literature, and poets like Ghalib, Iqbal, Faiz, and Mir Taqi Mir.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      ...result,
      originalQuery: query,
    };
  } catch (error) {
    console.error("OpenAI enhancement error:", error);

    // Handle quota exceeded error gracefully
    if (error.status === 429 || error.code === "insufficient_quota") {
      console.log("⚠️ OpenAI quota exceeded, using fallback enhancement");
      return {
        success: true,
        enhancedQuery: query,
        synonyms: [],
        relatedTerms: [],
        relatedPoets: [],
        poetryForms: [],
        emotionalContext: [],
        semanticExpansion: [],
        originalQuery: query,
        fallback: true,
      };
    }
    return {
      success: false,
      enhancedKeywords: [query],
      urduTranslation: query,
      relatedPoets: [],
      poetryForms: [],
      emotionalContext: [],
      semanticExpansion: [],
      originalQuery: query,
    };
  }
};

/**
 * Analyze and categorize extracted text from OCR
 * @param {string} text - Text extracted from image
 * @returns {object} - Analysis of the text
 */
export const analyzeExtractedText = async (text) => {
  // Return immediately if OpenAI is not configured
  if (!isOpenAIConfigured || !openai) {
    return {
      success: false,
      cleanedText: text,
      isPoetry: false,
      poetryForm: "unknown",
      themes: [],
      emotions: [],
      suggestedPoets: [],
      searchKeywords: [text],
      originalText: text,
      reason: "OpenAI API not configured",
    };
  }

  try {
    const prompt = `
Analyze this text extracted from an image (possibly Urdu poetry): "${text}"

Please provide:
1. Clean and corrected version of the text
2. Identify if it's poetry or prose
3. Guess the poetry form (ghazal, nazm, rubai, etc.)
4. Extract key themes and emotions
5. Suggest similar poets or works

Respond in JSON format:
{
  "cleanedText": "corrected text",
  "isPoetry": true/false,
  "poetryForm": "ghazal/nazm/rubai/etc",
  "themes": ["theme1", "theme2"],
  "emotions": ["emotion1", "emotion2"],
  "suggestedPoets": ["poet1", "poet2"],
  "searchKeywords": ["keyword1", "keyword2", "keyword3"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in Urdu poetry analysis and text correction, familiar with classical poets and forms.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      ...result,
      originalText: text,
    };
  } catch (error) {
    console.error("OpenAI text analysis error:", error);
    return {
      success: false,
      cleanedText: text,
      isPoetry: false,
      poetryForm: "unknown",
      themes: [],
      emotions: [],
      suggestedPoets: [],
      searchKeywords: [text],
      originalText: text,
    };
  }
};

/**
 * Generate contextual search suggestions
 * @param {string} partialQuery - Partial search query
 * @returns {array} - Array of suggestions
 */
export const generateSmartSuggestions = async (partialQuery) => {
  // Return immediately if OpenAI is not configured
  if (!isOpenAIConfigured || !openai) {
    return {
      success: false,
      suggestions: [],
      reason: "OpenAI API not configured",
    };
  }

  try {
    const prompt = `
Based on this partial Urdu poetry search: "${partialQuery}"

Generate 8-10 intelligent search suggestions that include:
- Complete the thought/phrase
- Related classical Urdu poetry themes
- Famous poet names if relevant
- Popular ghazal/nazm topics

Focus on classical Urdu poetry. Respond as a simple JSON array of strings:
["suggestion1", "suggestion2", "suggestion3", ...]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in classical Urdu poetry search patterns and user intent prediction.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const suggestions = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      suggestions: suggestions.slice(0, 10),
    };
  } catch (error) {
    console.error("OpenAI suggestions error:", error);

    // Handle quota exceeded error gracefully
    if (error.status === 429 || error.code === "insufficient_quota") {
      console.log("⚠️ OpenAI quota exceeded, using fallback suggestions");
      // Return some hardcoded popular suggestions
      const fallbackSuggestions = [
        "غالب کی غزلیں",
        "اقبال کی نظمیں",
        "فیض کی شاعری",
        "میر کے اشعار",
        "محبت کی شاعری",
        "غم کے اشعار",
        "وطن کی شاعری",
        "قدرت کی نظمیں",
      ];
      return {
        success: true,
        suggestions: fallbackSuggestions,
        fallback: true,
      };
    }

    return {
      success: false,
      suggestions: [],
    };
  }
};

/**
 * Improve voice transcription using context
 * @param {string} transcription - Voice transcription result
 * @param {number} confidence - Confidence score
 * @returns {object} - Improved transcription
 */
export const improveVoiceTranscription = async (transcription, confidence) => {
  if (confidence > 0.8) {
    return {
      success: true,
      improvedText: transcription,
      originalText: transcription,
      confidence: confidence,
    };
  }

  // Return immediately if OpenAI is not configured
  if (!isOpenAIConfigured || !openai) {
    return {
      success: false,
      improvedText: transcription,
      originalText: transcription,
      confidence: confidence,
      corrections: [],
      reason: "OpenAI API not configured",
    };
  }

  try {
    const prompt = `
This is a voice transcription of an Urdu poetry search with ${Math.round(
      confidence * 100
    )}% confidence: "${transcription}"

Please:
1. Correct any obvious transcription errors
2. Convert Roman Urdu to proper Urdu if needed
3. Fix common voice recognition mistakes for Urdu terms
4. Provide the most likely intended search query

Respond in JSON format:
{
  "improvedText": "corrected search query",
  "confidence": 0.9,
  "corrections": ["error1 -> fix1", "error2 -> fix2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in Urdu language and voice transcription error correction.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      ...result,
      originalText: transcription,
    };
  } catch (error) {
    console.error("OpenAI voice improvement error:", error);
    return {
      success: false,
      improvedText: transcription,
      originalText: transcription,
      confidence: confidence,
      corrections: [],
    };
  }
};

export default openai;
