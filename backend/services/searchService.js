const Fuse = require("fuse.js");
// OpenAI service removed
const rekhtaService = require("./rekhtaService");
const Poem = require("../models/Poem");
const User = require("../models/User");
const mongoose = require("mongoose");

class SearchService {
  constructor() {
    this.fuseOptions = {
      includeScore: true,
      threshold: 0.4,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 2,
      keys: [
        { name: "title", weight: 0.3 },
        { name: "titleInEnglish", weight: 0.2 },
        { name: "content", weight: 0.4 },
        { name: "author", weight: 0.2 },
        { name: "theme", weight: 0.15 },
        { name: "genre", weight: 0.1 },
        { name: "tags", weight: 0.1 },
      ],
    };

    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 15; // 15 minutes cache
  }

  // Cache management
  getCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Multi-modal search - main entry point
  async multiModalSearch(searchParams) {
    try {
      const {
        query,
        type = "text", // text, voice, image, semantic
        language = "auto",
        filters = {},
        userId = null,
        includeExternal = true,
        limit = 20,
        page = 1,
      } = searchParams;

      console.log(`🔍 Multi-modal search initiated: ${type.toUpperCase()}`);

      let searchResults = {
        localResults: [],
        externalResults: [],
        enhanced: false,
        searchType: type,
        totalResults: 0,
      };

      // Handle different search types
      switch (type) {
        case "text":
          searchResults = await this.textSearch(query, filters, limit, page);
          break;

        case "voice":
          searchResults = await this.voiceSearch(query, filters, limit, page);
          break;

        case "image":
          searchResults = await this.imageSearch(query, filters, limit, page);
          break;

        case "semantic":
          searchResults = await this.semanticSearch(
            query,
            filters,
            limit,
            page
          );
          break;

        case "fuzzy":
          searchResults = await this.fuzzySearch(query, filters, limit, page);
          break;

        default:
          searchResults = await this.textSearch(query, filters, limit, page);
      }

      // Enhance results with AI if requested
      if (searchParams.enhanceWithAI) {
        searchResults = await this.enhanceWithAI(searchResults, query);
      }

      // Include external results from Rekhta if requested
      if (includeExternal && query) {
        const externalResults = await this.searchExternal(query, filters);
        searchResults.externalResults = externalResults;
      }

      // Log search for analytics
      if (userId) {
        await this.logSearch(userId, query, type, searchResults.totalResults);
      }

      return {
        success: true,
        data: searchResults,
        query,
        type,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Multi-modal search error:", error);
      return {
        success: false,
        error: "Failed to perform multi-modal search",
        details: error.message,
      };
    }
  }

  // Text-based search with fuzzy matching
  async textSearch(query, filters = {}, limit = 20, page = 1) {
    try {
      const cacheKey = this.getCacheKey("text", {
        query,
        filters,
        limit,
        page,
      });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Build MongoDB query
      let mongoQuery = {};

      if (query) {
        mongoQuery.$or = [
          { title: { $regex: query, $options: "i" } },
          { titleInEnglish: { $regex: query, $options: "i" } },
          { content: { $regex: query, $options: "i" } },
          { author: { $regex: query, $options: "i" } },
          { authorInEnglish: { $regex: query, $options: "i" } },
          { theme: { $regex: query, $options: "i" } },
          { tags: { $in: [new RegExp(query, "i")] } },
        ];
      }

      // Apply filters
      if (filters.genre) {
        mongoQuery.genre = { $regex: filters.genre, $options: "i" };
      }
      if (filters.author) {
        mongoQuery.$or = [
          { author: { $regex: filters.author, $options: "i" } },
          { authorInEnglish: { $regex: filters.author, $options: "i" } },
        ];
      }
      if (filters.language) {
        mongoQuery.language = filters.language;
      }
      if (filters.dateRange) {
        mongoQuery.createdAt = {
          $gte: new Date(filters.dateRange.start),
          $lte: new Date(filters.dateRange.end),
        };
      }

      const skip = (page - 1) * limit;

      const poems = await Poem.find(mongoQuery)
        .populate("author", "name profileImage")
        .sort({ popularity: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Poem.countDocuments(mongoQuery);

      // Apply fuzzy search for better results
      let fuzzyResults = [];
      if (query && poems.length > 0) {
        const fuse = new Fuse(poems, this.fuseOptions);
        const fuseResults = fuse.search(query);
        fuzzyResults = fuseResults.map((result) => ({
          ...result.item,
          relevanceScore: 1 - result.score,
          searchScore: result.score,
        }));
      }

      const results = {
        localResults:
          fuzzyResults.length > 0
            ? fuzzyResults
            : poems.map((poem) => ({
                ...poem,
                relevanceScore: 0.5,
                searchScore: 0.5,
              })),
        externalResults: [],
        enhanced: false,
        searchType: "text",
        totalResults: totalCount,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          limit,
          totalCount,
        },
      };

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error("Text search error:", error);
      throw error;
    }
  }

  // Voice search (transcription-based)
  async voiceSearch(transcription, filters = {}, limit = 20, page = 1) {
    try {
      console.log("🎤 Processing voice search:", transcription);

      // AI enhancement removed. Use basic query only.
      // Fallback to text search
      return await this.textSearch(transcription, filters, limit, page);
    } catch (error) {
      console.error("Voice search error:", error);
      // Fallback to text search
      return await this.textSearch(transcription, filters, limit, page);
    }
  }

  // Image search (OCR-based)
  async imageSearch(extractedText, filters = {}, limit = 20, page = 1) {
    try {
      console.log("🖼️ Processing image search:", extractedText);

      if (!extractedText || extractedText.trim().length < 2) {
        return {
          localResults: [],
          externalResults: [],
          enhanced: false,
          searchType: "image",
          totalResults: 0,
          error: "No readable text found in image",
        };
      }

      // AI enhancement removed. Use basic query only.
      return await this.textSearch(extractedText, filters, limit, page);
    } catch (error) {
      console.error("Image search error:", error);
      return {
        localResults: [],
        externalResults: [],
        enhanced: false,
        searchType: "image",
        totalResults: 0,
        error: error.message,
      };
    }
  }

  // Semantic search using AI
  async semanticSearch(query, filters = {}, limit = 20, page = 1) {
    try {
      console.log("🧠 Processing semantic search:", query);

      // AI recommendations removed. Use basic recommendations only.
      return await this.textSearch(query, filters, limit, page);
    } catch (error) {
      console.error("Semantic search error:", error);
      return await this.textSearch(query, filters, limit, page);
    }
  }

  // Fuzzy search with advanced matching
  async fuzzySearch(query, filters = {}, limit = 20, page = 1) {
    try {
      console.log("🔍 Processing fuzzy search:", query);

      // Get all poems that might match
      let mongoQuery = {};
      if (filters.genre)
        mongoQuery.genre = { $regex: filters.genre, $options: "i" };
      if (filters.author) {
        mongoQuery.$or = [
          { author: { $regex: filters.author, $options: "i" } },
          { authorInEnglish: { $regex: filters.author, $options: "i" } },
        ];
      }

      const allPoems = await Poem.find(mongoQuery)
        .populate("author", "name profileImage")
        .lean();

      if (allPoems.length === 0) {
        return {
          localResults: [],
          externalResults: [],
          enhanced: false,
          searchType: "fuzzy",
          totalResults: 0,
        };
      }

      // Apply fuzzy search
      const fuse = new Fuse(allPoems, {
        ...this.fuseOptions,
        threshold: 0.6, // More lenient for fuzzy search
      });

      const fuseResults = fuse.search(query);
      const skip = (page - 1) * limit;
      const paginatedResults = fuseResults.slice(skip, skip + limit);

      const results = {
        localResults: paginatedResults.map((result) => ({
          ...result.item,
          relevanceScore: 1 - result.score,
          searchScore: result.score,
          matchedFields: result.matches?.map((match) => match.key) || [],
        })),
        externalResults: [],
        enhanced: true,
        searchType: "fuzzy",
        totalResults: fuseResults.length,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(fuseResults.length / limit),
          limit,
          totalCount: fuseResults.length,
        },
      };

      return results;
    } catch (error) {
      console.error("Fuzzy search error:", error);
      throw error;
    }
  }

  // Search external sources (Rekhta)
  async searchExternal(query, filters = {}) {
    try {
      console.log("🌐 Searching external sources:", query);

      const rekhtaResults = await rekhtaService.searchPoems(query, "poem");

      if (!rekhtaResults.success) {
        return [];
      }

      return rekhtaResults.results.map((result) => ({
        ...result,
        source: "rekhta",
        isExternal: true,
        relevanceScore: 0.7, // Default score for external results
      }));
    } catch (error) {
      console.error("External search error:", error);
      return [];
    }
  }

  // Enhance results with AI insights
  async enhanceWithAI(searchResults, originalQuery) {
    try {
      if (searchResults.localResults.length === 0) {
        return searchResults;
      }

      // AI analysis removed. No tone analysis available.
      // AI recommendations removed. No similar poetry available.
      return searchResults;
    } catch (error) {
      console.error("AI enhancement error:", error);
      return searchResults;
    }
  }

  // Advanced search with multiple criteria
  async advancedSearch(criteria) {
    try {
      const {
        textQuery,
        author,
        genre,
        theme,
        dateRange,
        language,
        tags,
        minRating,
        sortBy = "relevance",
        limit = 20,
        page = 1,
      } = criteria;

      let mongoQuery = {};

      // Text search
      if (textQuery) {
        mongoQuery.$or = [
          { title: { $regex: textQuery, $options: "i" } },
          { content: { $regex: textQuery, $options: "i" } },
          { author: { $regex: textQuery, $options: "i" } },
        ];
      }

      // Author filter
      if (author) {
        mongoQuery.$and = mongoQuery.$and || [];
        mongoQuery.$and.push({
          $or: [
            { author: { $regex: author, $options: "i" } },
            { authorInEnglish: { $regex: author, $options: "i" } },
          ],
        });
      }

      // Other filters
      if (genre) mongoQuery.genre = { $regex: genre, $options: "i" };
      if (theme) mongoQuery.theme = { $regex: theme, $options: "i" };
      if (language) mongoQuery.language = language;
      if (tags && tags.length > 0) {
        mongoQuery.tags = { $in: tags.map((tag) => new RegExp(tag, "i")) };
      }
      if (minRating) mongoQuery.averageRating = { $gte: minRating };

      // Date range
      if (dateRange) {
        mongoQuery.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end),
        };
      }

      // Sorting
      let sortOptions = {};
      switch (sortBy) {
        case "date":
          sortOptions = { createdAt: -1 };
          break;
        case "rating":
          sortOptions = { averageRating: -1, ratingsCount: -1 };
          break;
        case "popularity":
          sortOptions = { viewCount: -1, likesCount: -1 };
          break;
        case "author":
          sortOptions = { author: 1, title: 1 };
          break;
        default:
          sortOptions = { popularity: -1, createdAt: -1 };
      }

      const skip = (page - 1) * limit;

      const poems = await Poem.find(mongoQuery)
        .populate("author", "name profileImage")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Poem.countDocuments(mongoQuery);

      return {
        success: true,
        results: poems,
        totalCount,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          limit,
        },
      };
    } catch (error) {
      console.error("Advanced search error:", error);
      return {
        success: false,
        error: "Advanced search failed",
        details: error.message,
      };
    }
  }

  // Get search suggestions
  async getSearchSuggestions(partialQuery, limit = 10) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return { success: true, suggestions: [] };
      }

      const suggestions = await Poem.aggregate([
        {
          $match: {
            $or: [
              { title: { $regex: partialQuery, $options: "i" } },
              { author: { $regex: partialQuery, $options: "i" } },
              { theme: { $regex: partialQuery, $options: "i" } },
              { tags: { $regex: partialQuery, $options: "i" } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            titles: { $addToSet: "$title" },
            authors: { $addToSet: "$author" },
            themes: { $addToSet: "$theme" },
            tags: { $addToSet: "$tags" },
          },
        },
        {
          $project: {
            suggestions: {
              $slice: [
                {
                  $setUnion: [
                    "$titles",
                    "$authors",
                    "$themes",
                    {
                      $reduce: {
                        input: "$tags",
                        initialValue: [],
                        in: { $setUnion: ["$$value", "$$this"] },
                      },
                    },
                  ],
                },
                limit,
              ],
            },
          },
        },
      ]);

      return {
        success: true,
        suggestions: suggestions[0]?.suggestions || [],
      };
    } catch (error) {
      console.error("Search suggestions error:", error);
      return {
        success: false,
        error: "Failed to get search suggestions",
        details: error.message,
      };
    }
  }

  // Log search for analytics
  async logSearch(userId, query, type, resultCount) {
    try {
      // You can create a SearchLog model for this
      console.log(
        `📊 Search logged: User ${userId}, Query: "${query}", Type: ${type}, Results: ${resultCount}`
      );

      // Example implementation:
      // await SearchLog.create({
      //   userId,
      //   query,
      //   type,
      //   resultCount,
      //   timestamp: new Date()
      // });
    } catch (error) {
      console.error("Search logging error:", error);
    }
  }

  // Get popular searches
  async getPopularSearches(limit = 10) {
    try {
      // Get popular searches based on most viewed poems and categories
      const popularPoems = await Poem.find({ status: "published" })
        .sort({ views: -1 })
        .limit(20)
        .select("title category theme author");

      const popularCategories = [
        ...new Set(popularPoems.map((p) => p.category).filter(Boolean)),
      ].slice(0, Math.floor(limit / 2));

      const popularThemes = [
        ...new Set(popularPoems.map((p) => p.theme).filter(Boolean)),
      ].slice(0, Math.floor(limit / 2));

      const popularSearches = [
        ...popularCategories,
        ...popularThemes,
        ...popularPoems.slice(0, 3).map((p) => p.title),
      ].slice(0, limit);

      return {
        success: true,
        popularSearches,
      };
    } catch (error) {
      console.error("Popular searches error:", error);
      return {
        success: false,
        error: "Failed to get popular searches",
      };
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get search statistics
  getSearchStats() {
    return {
      cacheSize: this.cache.size,
      cacheEntries: Array.from(this.cache.keys()),
    };
  }
}

module.exports = new SearchService();
