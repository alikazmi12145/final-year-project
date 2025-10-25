/**
 * Poetry Service - Centralized API Management
 * Handles all API calls for OpenAI and other poetry APIs
 * Includes caching, error handling, retry logic, and token management
 */

import { poetryAPI } from "./api.jsx";
import openaiService from "./openaiService.js";

// Cache configuration
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 1000; // Maximum cached items

class PoetryCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, value) {
    // Implement LRU cache with size limit
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.timestamps.delete(oldestKey);
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

// Global cache instances
const poemsCache = new PoetryCache();
const poetsCache = new PoetryCache();
const biographiesCache = new PoetryCache();
const categoriesCache = new PoetryCache();

/**
 * Poetry Service Class
 * Manages all poetry-related API operations with caching and error handling
 */
class PoetryService {
  constructor() {
    this.retryCount = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Generic retry wrapper for API calls
   * @param {Function} apiCall - The API function to call
   * @param {number} retries - Number of retries remaining
   * @returns {Promise} - API response or error
   */
  async withRetry(apiCall, retries = this.retryCount) {
    try {
      return await apiCall();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.withRetry(apiCall, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return error.response?.status
      ? retryableCodes.includes(error.response.status)
      : true;
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Delay promise
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // =================== POEMS MANAGEMENT ===================

  /**
   * Fetch poems with dynamic filtering and caching
   * @param {Object} options - Search and filter options
   * @returns {Promise<Object>} - Poems data with metadata
   */
  async fetchPoems(options = {}) {
    const {
      page = 1,
      limit = 50, // Increased default limit for better performance
      category = "all",
      poet = null,
      search = "",
      sortBy = "popularity",
      language = "urdu",
    } = options;

    // Cap the limit to 100 to prevent performance issues
    const cappedLimit = Math.min(limit, 100);

    const cacheKey = `poems_${JSON.stringify({
      ...options,
      limit: cappedLimit,
    })}`;
    const cached = poemsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.withRetry(async () => {
        // Use local API for all poem queries
        const localResponse = await poetryAPI.getAllPoems({
          page,
          limit: cappedLimit,
          category: category !== "all" ? category : undefined,
          poet,
          search,
          language,
          sortBy,
          sortOrder: "desc",
        });

        return this.formatPoemsResponse(localResponse, "local");
      });

      poemsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("❌ Failed to fetch poems:", error);
      return {
        success: false,
        poems: [],
        total: 0,
        page,
        totalPages: 0,
        error: "Failed to load poems. Please try again.",
      };
    }
  }

  /**
   * Format poems response for consistent structure
   * @param {Object} response - API response
  * @param {string} source - API source (local)
   * @returns {Object} - Formatted response
   */
  formatPoemsResponse(response, source) {
    // Handle different response structures
    let poems = [];
    let total = 0;
    let page = 1;
    let totalPages = 0;
    let hasMore = false;

    // Axios responses have data property, so check response.data first
    const responseData = response.data || response;

    if (responseData.success && responseData.poems) {
      // Handle successful API response structure: { success: true, poems: [...], total: N, ... }
      poems = responseData.poems || [];
      total = responseData.total || poems.length;
      page = responseData.page || responseData.currentPage || 1;
      totalPages = responseData.totalPages || Math.ceil(total / 20);
      hasMore = responseData.hasMore || page < totalPages;
    } else if (responseData.data && responseData.data.poems) {
      // Handle nested data structure: { data: { poems: [...], total: N, ... } }
      poems = responseData.data.poems || [];
      total = responseData.data.total || poems.length;
      page = responseData.data.page || responseData.data.currentPage || 1;
      totalPages = responseData.data.totalPages || Math.ceil(total / 20);
      hasMore = responseData.data.hasMore || page < totalPages;
    } else if (Array.isArray(responseData)) {
      // Handle direct array response
      poems = responseData;
      total = poems.length;
    } else if (Array.isArray(responseData.poems)) {
      // Handle direct poems property
      poems = responseData.poems;
      total = responseData.total || poems.length;
      page = responseData.page || 1;
      totalPages = responseData.totalPages || Math.ceil(total / 20);
      hasMore = responseData.hasMore || page < totalPages;
    }

    return {
      success: true,
      poems: (poems || []).map((poem) => ({
        _id: poem._id || poem.id,
        title: poem.title || poem.heading || "بے نام",
        content: poem.content || poem.text || poem.verses?.join("\n") || "",
        poet: this.formatPoetInfo(poem.poet || poem.author),
        category: poem.category || poem.type || "غزل",
        language: poem.language || "urdu",
        translation: poem.translation || null,
        metadata: {
          views: poem.views || 0,
          likes: poem.likes || 0,
          shares: poem.shares || 0,
          difficulty: poem.difficulty || "medium",
          tags: poem.tags || [],
          source,
        },
        createdAt: poem.createdAt || poem.date || new Date().toISOString(),
      })),
      total,
      page,
      totalPages,
      hasMore,
    };
  }
  /**
   * Format poet information consistently
   * @param {Object} poet - Poet data
   * @returns {Object} - Formatted poet info
   */
  formatPoetInfo(poet) {
    if (!poet) return { name: "نامعلوم شاعر", slug: "unknown" };

    return {
      _id: poet._id || poet.id,
      name: poet.name || poet.title || "نامعلوم شاعر",
      slug: poet.slug || poet.name?.toLowerCase().replace(/\s+/g, "-"),
      image: poet.image || poet.avatar || poet.profilePicture,
      bio: poet.bio || poet.description,
  isClassical: poet.isClassical || false,
    };
  }

  // =================== POET MANAGEMENT ===================

  /**
   * Fetch poet details dynamically
   * @param {string} poetId - Poet ID or slug
   * @returns {Promise<Object>} - Poet data with biography and poems
   */
  async fetchPoet(poetId) {
    const cacheKey = `poet_${poetId}`;
    const cached = poetsCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.withRetry(async () => {
        // Try different sources
        let poetData = null;

        // Use local API for poet data
        const localResponse = await poetryAPI.getPoetById(poetId);
        if (localResponse.success) {
          poetData = this.formatPoetResponse(localResponse.data, "local");
        }

        if (!poetData) {
          throw new Error("Poet not found");
        }

        // Fetch poet's poems
        const poemsResponse = await this.fetchPoems({
          poet: poetId,
          limit: 50,
        });
        poetData.poems = poemsResponse.poems;

        // Enhance biography with AI if needed
        if (poetData.bio && poetData.bio.length > 500) {
          try {
            poetData.aiSummary = await this.generateBiographySummary(
              poetData.bio
            );
          } catch (aiError) {
            console.warn("AI summary failed:", aiError.message);
          }
        }

        return poetData;
      });

      poetsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Failed to fetch poet:", error);
      return {
        success: false,
        error: "Poet not found or failed to load.",
      };
    }
  }

  /**
   * Format poet response for consistent structure
   * @param {Object} poet - Raw poet data
   * @param {string} source - Data source
   * @returns {Object} - Formatted poet data
   */
  formatPoetResponse(poet, source) {
    return {
      success: true,
      _id: poet._id || poet.id,
      name: poet.name || poet.title,
      slug: poet.slug || poet.name?.toLowerCase().replace(/\s+/g, "-"),
      penName: poet.penName || poet.takhallus,
      image: poet.image || poet.avatar || poet.profilePicture,
      bio: poet.bio || poet.description || poet.biography,
      birthDate: poet.birthDate || poet.born,
      deathDate: poet.deathDate || poet.died,
      birthPlace: poet.birthPlace || poet.location,
      era: poet.era || this.determineEra(poet.birthDate, poet.deathDate),
      language: poet.language || "urdu",
  isClassical: poet.isClassical || false,
      stats: {
        totalPoems: poet.totalPoems || poet.poemCount || 0,
        totalLikes: poet.totalLikes || 0,
        followers: poet.followers || 0,
        views: poet.views || 0,
      },
      socialLinks: poet.socialLinks || {},
      achievements: poet.achievements || [],
      source,
    };
  }

  /**
   * Determine poet's era based on dates
   * @param {string} birthDate - Birth date
   * @param {string} deathDate - Death date
   * @returns {string} - Era classification
   */
  determineEra(birthDate, deathDate) {
    const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
    const deathYear = deathDate ? new Date(deathDate).getFullYear() : null;
    const currentYear = new Date().getFullYear();

    if (!birthYear) return "unknown";

    if (birthYear < 1857) return "classical";
    if (birthYear < 1947) return "modern";
    if (deathYear && deathYear < currentYear) return "contemporary";
    return "living";
  }

  // =================== BIOGRAPHY MANAGEMENT ===================

  /**
   * Generate AI-enhanced biography summary using OpenAI service
   * @param {string} biography - Original biography
   * @returns {Promise<string>} - Summarized biography
   */
  async generateBiographySummary(biography) {
    const cacheKey = `bio_summary_${biography.substring(0, 100)}`;
    const cached = biographiesCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Use enhanced OpenAI service
      const summary = await openaiService.generateBiographySummary(biography, {
        maxLength: 150,
        language: "urdu",
        includeAchievements: true,
        includeTimeline: true,
      });

      biographiesCache.set(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error("Failed to generate biography summary:", error);
      // Fallback: Return first 200 characters as final fallback
      return biography.substring(0, 200) + "...";
    }
  }

  /**
   * Translate biography to English using OpenAI service
   * @param {string} urduBio - Urdu biography
   * @returns {Promise<string>} - English translation
   */
  async translateBiography(urduBio) {
    const cacheKey = `bio_translation_${urduBio.substring(0, 100)}`;
    const cached = biographiesCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Use enhanced OpenAI service
      const translation = await openaiService.translateToEnglish(urduBio, {
        context: "This is a poet biography from Urdu literature",
        style: "formal",
        preservePoetry: false,
      });

      biographiesCache.set(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error("Failed to translate biography:", error);
      // Fallback: Return static message
      return "Translation not available";
    }
  }

  // =================== CATEGORIES & THEMES ===================

  /**
   * Fetch poem categories dynamically
   * @returns {Promise<Array>} - Categories array
   */
  async fetchCategories() {
    const cacheKey = "categories_all";
    const cached = categoriesCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.withRetry(async () => {
        // Default categories with Urdu names
        const defaultCategories = [
          {
            id: "ghazal",
            name: "غزل",
            nameEn: "Ghazal",
            description: "Love and loss poetry",
          },
          {
            id: "nazm",
            name: "نظم",
            nameEn: "Nazm",
            description: "Free verse poetry",
          },
          {
            id: "rubai",
            name: "رباعی",
            nameEn: "Rubai",
            description: "Quatrain poetry",
          },
          {
            id: "qasida",
            name: "قصیدہ",
            nameEn: "Qasida",
            description: "Panegyric poetry",
          },
          {
            id: "hamd",
            name: "حمد",
            nameEn: "Hamd",
            description: "Praise of Allah",
          },
          {
            id: "naat",
            name: "نعت",
            nameEn: "Naat",
            description: "Praise of Prophet",
          },
          {
            id: "manqabat",
            name: "منقبت",
            nameEn: "Manqabat",
            description: "Praise poetry",
          },
          {
            id: "marsiya",
            name: "مرثیہ",
            nameEn: "Marsiya",
            description: "Elegy poetry",
          },
          {
            id: "qita",
            name: "قطعہ",
            nameEn: "Qita",
            description: "Fragment poetry",
          },
        ];

        // Try to fetch from API
        try {
          const response = await poetryAPI.getCategories();
          if (response.success && response.data?.categories) {
            const apiCategories = response.data.categories.map((cat) => ({
              id: cat._id || cat.id,
              name: cat.name || cat.title,
              nameEn: cat.nameEn || cat.englishName || cat.name,
              description: cat.description || "",
              count: cat.count || 0,
            }));

            // Merge with defaults, prioritizing API data
            const merged = defaultCategories.map((defaultCat) => {
              const apiCat = apiCategories.find(
                (ac) => ac.id === defaultCat.id || ac.name === defaultCat.name
              );
              return apiCat ? { ...defaultCat, ...apiCat } : defaultCat;
            });

            categoriesCache.set(cacheKey, merged);
            return merged;
          }
        } catch (apiError) {
          console.warn(
            "Categories API failed, using defaults:",
            apiError.message
          );
        }

        categoriesCache.set(cacheKey, defaultCategories);
        return defaultCategories;
      });

      return result;
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  }

  // =================== SEARCH & DISCOVERY ===================

  /**
   * Smart search with fuzzy matching
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async smartSearch(query, options = {}) {
    const {
      type = "all", // 'poems', 'poets', 'all'
      limit = 20,
      fuzzy = true,
    } = options;

    if (!query || query.trim().length < 2) {
      return { poems: [], poets: [], suggestions: [] };
    }

    const cacheKey = `search_${query}_${type}_${limit}`;
    const cached = poemsCache.get(cacheKey);
    if (cached) return cached;

    try {
      const results = await this.withRetry(async () => {
        const searchResults = { poems: [], poets: [], suggestions: [] };

        // Search poems
        if (type === "all" || type === "poems") {
          const poemsResponse = await this.fetchPoems({ search: query, limit });
          searchResults.poems = poemsResponse.poems;
        }

        // Search poets
        if (type === "all" || type === "poets") {
          try {
            const poetsResponse = await poetryAPI.searchPoets({
              search: query,
              limit,
            });
            if (poetsResponse.success) {
              searchResults.poets = poetsResponse.data.poets.map((poet) =>
                this.formatPoetInfo(poet)
              );
            }
          } catch (error) {
            console.warn("Poet search failed:", error.message);
          }
        }

        // Generate AI suggestions if enabled
        if (fuzzy && query.length > 3) {
          // Fallback: No AI suggestions available
          searchResults.suggestions = [];
        }

        return searchResults;
      });

      poemsCache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error("Search failed:", error);
      return { poems: [], poets: [], suggestions: [], error: "Search failed" };
    }
  }

  /**
   * Get search suggestions for autocomplete
   * @param {string} query - Partial query
   * @returns {Promise<Array>} - Suggestions array
   */
  async getSearchSuggestions(query) {
    if (!query || query.length < 2) return [];

    const cacheKey = `suggestions_${query}`;
    const cached = poemsCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Generate suggestions based on popular searches and AI
      const suggestions = [
        ...this.getPopularSearches(query),
        ...(await this.getAISuggestions(query)),
      ];

      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);
      poemsCache.set(cacheKey, uniqueSuggestions);
      return uniqueSuggestions;
    } catch (error) {
      console.error("Failed to get suggestions:", error);
      return [];
    }
  }

  /**
   * Get popular search suggestions
   * @param {string} query - Query string
   * @returns {Array} - Popular suggestions
   */
  getPopularSearches(query) {
    const popular = [
      "غزل",
      "نظم",
      "رباعی",
      "حمد",
      "نعت",
      "مرزا غالب",
      "علامہ اقبال",
      "فیض احمد فیض",
      "احمد فراز",
      "پروین شاکر",
      "ناصر کاظمی",
    ];

    return popular.filter(
      (term) => term.includes(query) || query.includes(term)
    );
  }

  /**
   * Get AI-powered suggestions
   * @param {string} query - Query string
   * @returns {Promise<Array>} - AI suggestions
   */
  async getAISuggestions(query) {
    // Fallback: No AI suggestions available
    return [];
  }

  // =================== POEM TRANSLATION ===================

  /**
   * Translate poem to English using enhanced AI
   * @param {string} urduPoem - Urdu poem text
   * @param {Object} metadata - Poem metadata for context
   * @returns {Promise<string>} - English translation
   */
  async translatePoem(urduPoem, metadata = {}) {
    const cacheKey = `poem_translation_${urduPoem.substring(0, 100)}`;
    const cached = poemsCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Use enhanced OpenAI service with context
      const translation = await openaiService.translateToEnglish(urduPoem, {
        context: `This is a ${metadata.category || "poem"} by ${
          metadata.poet?.name || "unknown poet"
        }`,
        style: metadata.style || "poetic",
        preservePoetry: true,
      });

      poemsCache.set(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error("Translation failed:", error);
      // Fallback to basic API
      // Fallback: Return static message
      return "Translation not available";
    }
  }

  // =================== RECOMMENDATIONS ===================

  /**
   * Get related poems using enhanced AI recommendations
   * @param {Object} poem - Current poem
   * @returns {Promise<Array>} - Related poems
   */
  async getRelatedPoems(poem) {
    const cacheKey = `related_${poem._id}`;
    const cached = poemsCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Get all available poems for AI analysis
      const allPoemsResponse = await this.fetchPoems({ limit: 100 });
      const availablePoems = allPoemsResponse.poems || [];

      // Use enhanced OpenAI service for similarity matching
      try {
        const similarPoems = await openaiService.findSimilarPoems(
          poem.content,
          availablePoems.filter((p) => p._id !== poem._id),
          {
            maxResults: 6,
            similarityThreshold: 0.7,
            includeThemeAnalysis: true,
          }
        );

        const relatedPoems = similarPoems.map((item) => item.poem);
        poemsCache.set(cacheKey, relatedPoems);
        return relatedPoems;
      } catch (aiError) {
        console.warn("AI similarity search failed:", aiError.message);

        // Fallback to category-based matching
        const categoryPoems = await this.fetchPoems({
          category: poem.category,
          limit: 10,
        });

        const related = categoryPoems.poems.filter((p) => p._id !== poem._id);

        // Try basic AI recommendations as secondary fallback
        // Fallback: Only use category-based related poems
        poemsCache.set(cacheKey, related.slice(0, 6));
        return related.slice(0, 6);
      }
    } catch (error) {
      console.error("Failed to get related poems:", error);
      return [];
    }
  }

  /**
   * Generate intelligent poem recommendations for users
   * @param {Object} userProfile - User preferences and history
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} - Recommended poems with reasoning
   */
  async generatePoemRecommendations(userProfile, options = {}) {
    const cacheKey = `recommendations_${JSON.stringify(
      userProfile
    )}_${JSON.stringify(options)}`;
    const cached = poemsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1800000) {
      // 30 minutes cache
      return cached.data;
    }

    try {
      // Get available poems
      const allPoemsResponse = await this.fetchPoems({ limit: 200 });
      const availablePoems = allPoemsResponse.poems || [];

      // Use enhanced OpenAI service for personalized recommendations
      const recommendations = await openaiService.generatePoemRecommendations(
        userProfile,
        availablePoems,
        {
          maxRecommendations: options.maxRecommendations || 10,
          includeReasoning: true,
          diversityFactor: options.diversityFactor || 0.7,
        }
      );

      // Cache with timestamp
      const result = {
        data: recommendations,
        timestamp: Date.now(),
      };

      poemsCache.set(cacheKey, result);
      return recommendations;
    } catch (error) {
      console.error("AI recommendations failed:", error);

      // Fallback to simple category-based recommendations
      return await this.generateSimpleRecommendations(userProfile, options);
    }
  }

  /**
   * Analyze poem sentiment and themes using AI
   * @param {Object} poem - Poem to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzePoemSentiment(poem, options = {}) {
    const cacheKey = `sentiment_${poem._id}_${JSON.stringify(options)}`;
    const cached = poemsCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Use enhanced OpenAI service for detailed analysis
      const analysis = await openaiService.analyzePoemSentiment(poem.content, {
        includeThemes: true,
        includeEmotions: true,
        includeLiteraryDevices: options.detailed || false,
      });

      poemsCache.set(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.error("Sentiment analysis failed:", error);

      // Return basic fallback analysis
      return {
        emotions: ["غیر معین"],
        themes: ["عام"],
        tone: "neutral",
        mood: "contemplative",
        culturalContext: "Classical Urdu poetry",
      };
    }
  }

  /**
   * Simple fallback recommendations based on user preferences
   * @param {Object} userProfile - User preferences
   * @param {Object} options - Options
   * @returns {Promise<Array>} - Simple recommendations
   */
  async generateSimpleRecommendations(userProfile, options = {}) {
    const maxRecommendations = options.maxRecommendations || 10;
    const recommendations = [];

    try {
      // Get poems from preferred categories
      if (userProfile.preferredCategories?.length > 0) {
        for (const category of userProfile.preferredCategories) {
          const categoryResponse = await this.fetchPoems({
            category,
            limit: 3,
            sortBy: "popularity",
          });

          recommendations.push(
            ...(categoryResponse.poems || []).map((poem) => ({
              poem,
              reason: `Based on your interest in ${category}`,
            }))
          );
        }
      }

      // Get poems from favorite poets
      if (userProfile.favoritePoets?.length > 0) {
        for (const poetName of userProfile.favoritePoets) {
          const poetResponse = await this.fetchPoems({
            search: poetName,
            limit: 2,
          });

          recommendations.push(
            ...(poetResponse.poems || []).map((poem) => ({
              poem,
              reason: `By your favorite poet ${poetName}`,
            }))
          );
        }
      }

      // Fill remaining slots with popular poems
      const remaining = maxRecommendations - recommendations.length;
      if (remaining > 0) {
        const popularResponse = await this.fetchPoems({
          limit: remaining,
          sortBy: "popularity",
        });

        const popularPoems = (popularResponse.poems || [])
          .filter((p) => !recommendations.find((r) => r.poem._id === p._id))
          .slice(0, remaining);

        recommendations.push(
          ...popularPoems.map((poem) => ({
            poem,
            reason: "Popular in community",
          }))
        );
      }

      return recommendations.slice(0, maxRecommendations);
    } catch (error) {
      console.error("Simple recommendations failed:", error);
      return [];
    }
  }

  // =================== CACHE MANAGEMENT ===================

  /**
   * Clear all caches
   */
  clearCache() {
    poemsCache.clear();
    poetsCache.clear();
    biographiesCache.clear();
    categoriesCache.clear();
    console.log("All caches cleared");
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      poems: poemsCache.cache.size,
      poets: poetsCache.cache.size,
      biographies: biographiesCache.cache.size,
      categories: categoriesCache.cache.size,
      total:
        poemsCache.cache.size +
        poetsCache.cache.size +
        biographiesCache.cache.size +
        categoriesCache.cache.size,
    };
  }
}

// Export singleton instance
export const poetryService = new PoetryService();
export default poetryService;
