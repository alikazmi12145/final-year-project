/**
 * OpenAI Integration Service
 * Handles AI-powered features like translation, biography summarization,
 * poem recommendations, and intelligent content generation
 */

import { openaiAPI } from "./api.jsx";

class OpenAIService {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map();
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      maxRequests: 50, // Max requests per minute
    };
  }

  /**
   * Extract content from API response safely
   * @param {Object} response - API response
   * @returns {string} - Extracted content
   */
  extractAPIContent(response) {
    // Handle different response formats
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    if (response.data?.text) {
      return response.data.text;
    }
    if (response.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }
    if (response.text) {
      return response.text;
    }
    return "";
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const now = Date.now();
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + 60000;
    }

    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    this.rateLimiter.requests++;
  }

  /**
   * Create cache key
   */
  createCacheKey(type, content, options = {}) {
    return `${type}:${JSON.stringify({ content, options })}`;
  }

  /**
   * Get cached result
   */
  getCached(key) {
    return this.cache.get(key);
  }

  /**
   * Set cache result
   */
  setCached(key, result, ttl = 3600000) {
    // 1 hour default TTL
    this.cache.set(key, {
      result,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Translate Urdu text to English
   * @param {string} urduText - Urdu text to translate
   * @param {Object} options - Translation options
   * @returns {Promise<string>} - Translated text
   */
  async translateToEnglish(urduText, options = {}) {
    const cacheKey = this.createCacheKey("translate_en", urduText, options);
    const cached = this.getCached(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    this.checkRateLimit();

    try {
      const prompt = this.buildTranslationPrompt(urduText, "english", options);
      const response = await openaiAPI.generateText({
        messages: [
          {
            role: "system",
            content:
              "You are an expert Urdu to English translator specializing in poetry and literature. Maintain the poetic essence and cultural context.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 1000,
        temperature: 0.3,
      });

      const translation = this.extractTranslation(
        this.extractAPIContent(response)
      );
      this.setCached(cacheKey, translation);

      return translation;
    } catch (error) {
      console.error("Translation failed:", error);
      throw new Error("Translation service temporarily unavailable");
    }
  }

  /**
   * Translate English text to Urdu
   * @param {string} englishText - English text to translate
   * @param {Object} options - Translation options
   * @returns {Promise<string>} - Translated text
   */
  async translateToUrdu(englishText, options = {}) {
    const cacheKey = this.createCacheKey("translate_ur", englishText, options);
    const cached = this.getCached(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    this.checkRateLimit();

    try {
      const prompt = this.buildTranslationPrompt(englishText, "urdu", options);
      const response = await openaiAPI.generateText({
        messages: [
          {
            role: "system",
            content:
              "You are an expert English to Urdu translator specializing in poetry and literature. Use proper Urdu script and maintain cultural authenticity.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 1000,
        temperature: 0.3,
      });

      const translation = this.extractTranslation(
        this.extractAPIContent(response)
      );
      this.setCached(cacheKey, translation);

      return translation;
    } catch (error) {
      console.error("Translation failed:", error);
      throw new Error("Translation service temporarily unavailable");
    }
  }

  /**
   * Generate biography summary
   * @param {string} biography - Full biography text
   * @param {Object} options - Summary options
   * @returns {Promise<string>} - Summarized biography
   */
  async generateBiographySummary(biography, options = {}) {
    const cacheKey = this.createCacheKey("bio_summary", biography, options);
    const cached = this.getCached(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    this.checkRateLimit();

    const {
      maxLength = 200,
      language = "urdu",
      includeAchievements = true,
      includeTimeline = true,
    } = options;

    try {
      const prompt = this.buildBiographySummaryPrompt(biography, {
        maxLength,
        language,
        includeAchievements,
        includeTimeline,
      });

      const response = await openaiAPI.generateText({
        messages: [
          {
            role: "system",
            content: `You are an expert literary biographer specializing in Urdu poets and writers. Create concise, informative summaries that capture the essence of the poet's life and contributions.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: Math.min(maxLength * 2, 500),
        temperature: 0.4,
      });

      const summary = this.extractAPIContent(response).trim();
      this.setCached(cacheKey, summary);

      return summary;
    } catch (error) {
      console.error("Biography summary failed:", error);
      throw new Error("Summary generation temporarily unavailable");
    }
  }

  /**
   * Generate poem recommendations based on user preferences
   * @param {Object} userProfile - User preferences and history
   * @param {Array} availablePoems - Available poems to recommend from
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} - Recommended poems
   */
  async generatePoemRecommendations(userProfile, availablePoems, options = {}) {
    const cacheKey = this.createCacheKey("recommendations", userProfile, {
      availablePoems: availablePoems.length,
      ...options,
    });
    const cached = this.getCached(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    this.checkRateLimit();

    const {
      maxRecommendations = 10,
      includeReasoning = false,
      diversityFactor = 0.7,
    } = options;

    try {
      const prompt = this.buildRecommendationPrompt(
        userProfile,
        availablePoems,
        {
          maxRecommendations,
          includeReasoning,
          diversityFactor,
        }
      );

      const response = await openaiAPI.generateText({
        messages: [
          {
            role: "system",
            content:
              "You are an expert Urdu poetry curator with deep knowledge of classical and modern Urdu literature. Recommend poems based on user preferences, ensuring diversity and quality.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 800,
        temperature: 0.6,
      });

      const recommendations = this.parseRecommendations(
        this.extractAPIContent(response),
        availablePoems
      );
      this.setCached(cacheKey, recommendations, 1800000); // 30 minutes cache for recommendations

      return recommendations;
    } catch (error) {
      console.error("Recommendation generation failed:", error);
      throw new Error("Recommendation service temporarily unavailable");
    }
  }

  /**
   * Analyze poem sentiment and themes
   * @param {string} poemContent - Poem content to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzePoemSentiment(poemContent, options = {}) {
    const cacheKey = this.createCacheKey("sentiment", poemContent, options);
    const cached = this.getCached(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    this.checkRateLimit();

    try {
      const prompt = this.buildSentimentAnalysisPrompt(poemContent, options);

      const response = await openaiAPI.generateText({
        messages: [
          {
            role: "system",
            content:
              "You are an expert in Urdu poetry analysis with deep understanding of emotions, themes, and literary devices in Urdu literature.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 600,
        temperature: 0.3,
      });

      const analysis = this.parseSentimentAnalysis(
        this.extractAPIContent(response)
      );
      this.setCached(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error("Sentiment analysis failed:", error);
      throw new Error("Analysis service temporarily unavailable");
    }
  }

  /**
   * Generate similar poems based on content
   * @param {string} poemContent - Source poem content
   * @param {Array} availablePoems - Available poems to search through
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Similar poems
   */
  async findSimilarPoems(poemContent, availablePoems, options = {}) {
    const cacheKey = this.createCacheKey("similar", poemContent, {
      availablePoems: availablePoems.length,
      ...options,
    });
    const cached = this.getCached(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    this.checkRateLimit();

    const {
      maxResults = 5,
      similarityThreshold = 0.7,
      includeThemeAnalysis = false,
    } = options;

    try {
      const prompt = this.buildSimilarityPrompt(poemContent, availablePoems, {
        maxResults,
        similarityThreshold,
        includeThemeAnalysis,
      });

      const response = await openaiAPI.generateText({
        messages: [
          {
            role: "system",
            content:
              "You are an expert in Urdu poetry with ability to identify thematic, stylistic, and emotional similarities between poems.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 600,
        temperature: 0.4,
      });

      const similarPoems = this.parseSimilarPoems(
        this.extractAPIContent(response),
        availablePoems
      );
      this.setCached(cacheKey, similarPoems);

      return similarPoems;
    } catch (error) {
      console.error("Similar poems search failed:", error);
      throw new Error("Similarity search temporarily unavailable");
    }
  }

  // =================== PROMPT BUILDERS ===================

  buildTranslationPrompt(text, targetLanguage, options) {
    const { context, style, preservePoetry = true } = options;

    let prompt = `Please translate the following text to ${targetLanguage}:\n\n${text}\n\n`;

    if (preservePoetry && targetLanguage === "english") {
      prompt +=
        "This is a piece of Urdu poetry. Please maintain the poetic essence, rhythm, and cultural context while translating. ";
    }

    if (context) {
      prompt += `Context: ${context}\n`;
    }

    if (style) {
      prompt += `Style preference: ${style}\n`;
    }

    prompt += "Provide only the translation without additional explanations.";

    return prompt;
  }

  buildBiographySummaryPrompt(biography, options) {
    const { maxLength, language, includeAchievements, includeTimeline } =
      options;

    let prompt = `Please create a concise summary of the following biography in ${language}:\n\n${biography}\n\n`;
    prompt += `Requirements:\n`;
    prompt += `- Maximum length: ${maxLength} words\n`;
    prompt += `- Language: ${language}\n`;

    if (includeAchievements) {
      prompt += `- Include major literary achievements\n`;
    }

    if (includeTimeline) {
      prompt += `- Include important dates and timeline\n`;
    }

    prompt += `- Focus on literary significance and cultural impact\n`;
    prompt += `- Use appropriate cultural context\n`;

    return prompt;
  }

  buildRecommendationPrompt(userProfile, availablePoems, options) {
    const { maxRecommendations, includeReasoning, diversityFactor } = options;

    let prompt = `Based on the following user profile, recommend ${maxRecommendations} poems from the available collection:\n\n`;

    prompt += `User Profile:\n`;
    prompt += `- Preferred categories: ${
      userProfile.preferredCategories?.join(", ") || "Mixed"
    }\n`;
    prompt += `- Favorite poets: ${
      userProfile.favoritePoets?.join(", ") || "Various"
    }\n`;
    prompt += `- Recent interactions: ${
      userProfile.recentLikes?.length || 0
    } likes, ${userProfile.recentViews?.length || 0} views\n`;

    if (userProfile.readingHistory) {
      prompt += `- Reading patterns: ${userProfile.readingHistory}\n`;
    }

    prompt += `\nAvailable poems (showing first 20 as sample):\n`;
    availablePoems.slice(0, 20).forEach((poem, index) => {
      prompt += `${index + 1}. "${poem.title}" by ${
        poem.poet?.name || "Unknown"
      } (${poem.category})\n`;
    });

    prompt += `\nRecommendation criteria:\n`;
    prompt += `- Diversity factor: ${diversityFactor} (0 = similar, 1 = diverse)\n`;
    prompt += `- Consider user's interaction patterns\n`;
    prompt += `- Include mix of popular and hidden gems\n`;

    if (includeReasoning) {
      prompt += `- Provide brief reasoning for each recommendation\n`;
    }

    prompt += `\nProvide recommendations as a numbered list with poem titles and poet names.`;

    return prompt;
  }

  buildSentimentAnalysisPrompt(poemContent, options) {
    const {
      includeThemes = true,
      includeEmotions = true,
      includeLiteraryDevices = false,
    } = options;

    let prompt = `Analyze the following Urdu poem:\n\n${poemContent}\n\n`;
    prompt += `Please provide analysis for:\n`;

    if (includeEmotions) {
      prompt += `- Primary emotions and sentiments\n`;
    }

    if (includeThemes) {
      prompt += `- Main themes and subjects\n`;
    }

    if (includeLiteraryDevices) {
      prompt += `- Notable literary devices used\n`;
    }

    prompt += `- Overall tone and mood\n`;
    prompt += `- Cultural and historical context if relevant\n`;
    prompt += `\nProvide response in JSON format with appropriate fields.`;

    return prompt;
  }

  buildSimilarityPrompt(poemContent, availablePoems, options) {
    const { maxResults, similarityThreshold, includeThemeAnalysis } = options;

    let prompt = `Find poems similar to the following poem:\n\n${poemContent}\n\n`;
    prompt += `Search through these available poems:\n`;

    availablePoems.slice(0, 30).forEach((poem, index) => {
      prompt += `${index + 1}. "${poem.title}" by ${
        poem.poet?.name || "Unknown"
      }\n`;
      if (poem.content) {
        prompt += `   Content: ${poem.content.substring(0, 100)}...\n`;
      }
    });

    prompt += `\nCriteria:\n`;
    prompt += `- Find ${maxResults} most similar poems\n`;
    prompt += `- Consider thematic similarity\n`;
    prompt += `- Consider emotional tone\n`;
    prompt += `- Consider literary style\n`;

    if (includeThemeAnalysis) {
      prompt += `- Include theme analysis for each match\n`;
    }

    prompt += `\nProvide results as numbered list with poem titles and similarity reasons.`;

    return prompt;
  }

  // =================== RESPONSE PARSERS ===================

  extractTranslation(response) {
    // Remove any explanatory text and return just the translation
    const lines = response.split("\n");
    const translationLines = lines.filter(
      (line) =>
        !line.toLowerCase().includes("translation:") &&
        !line.toLowerCase().includes("note:") &&
        !line.toLowerCase().includes("explanation:") &&
        line.trim().length > 0
    );

    return translationLines.join("\n").trim();
  }

  parseRecommendations(response, availablePoems) {
    const lines = response.split("\n");
    const recommendations = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*"([^"]+)"\s*by\s*(.+?)(?:\s*\(|$)/i);
      if (match) {
        const [, title, poet] = match;
        const poem = availablePoems.find(
          (p) =>
            p.title.toLowerCase().includes(title.toLowerCase()) ||
            p.poet?.name?.toLowerCase().includes(poet.toLowerCase())
        );

        if (poem) {
          recommendations.push({
            poem,
            reason: line.includes("-")
              ? line.split("-")[1]?.trim()
              : "Recommended based on your preferences",
          });
        }
      }
    }

    return recommendations;
  }

  parseSentimentAnalysis(response) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fall back to text parsing
    }

    // Parse structured text response
    const analysis = {
      emotions: [],
      themes: [],
      tone: "neutral",
      mood: "contemplative",
      culturalContext: "",
    };

    const lines = response.split("\n");
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("emotion") || lower.includes("sentiment")) {
        analysis.emotions.push(line.split(":")[1]?.trim() || "");
      } else if (lower.includes("theme") || lower.includes("subject")) {
        analysis.themes.push(line.split(":")[1]?.trim() || "");
      } else if (lower.includes("tone")) {
        analysis.tone = line.split(":")[1]?.trim() || "neutral";
      } else if (lower.includes("mood")) {
        analysis.mood = line.split(":")[1]?.trim() || "contemplative";
      } else if (lower.includes("context")) {
        analysis.culturalContext = line.split(":")[1]?.trim() || "";
      }
    }

    return analysis;
  }

  parseSimilarPoems(response, availablePoems) {
    const lines = response.split("\n");
    const similarPoems = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*"([^"]+)"/i);
      if (match) {
        const title = match[1];
        const poem = availablePoems.find((p) =>
          p.title.toLowerCase().includes(title.toLowerCase())
        );

        if (poem) {
          similarPoems.push({
            poem,
            similarity: line.includes("-")
              ? line.split("-")[1]?.trim()
              : "Similar themes and style",
          });
        }
      }
    }

    return similarPoems;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Get service statistics
   */
  getStats() {
    this.cleanCache();
    return {
      cacheSize: this.cache.size,
      requestsThisMinute: this.rateLimiter.requests,
      rateLimitReset: new Date(this.rateLimiter.resetTime).toISOString(),
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const openaiService = new OpenAIService();
export default openaiService;
