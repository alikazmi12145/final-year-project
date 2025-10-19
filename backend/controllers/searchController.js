import Poem from "../models/Poem.js";
import User from "../models/User.js";
import Poet from "../models/poet.js";
import natural from "natural";
import Tesseract from "tesseract.js";
import Fuse from "fuse.js";
import cloudinary from "../config/cloudinary.js";
import RekhtaService from "../services/rekhtaService.js";
import AIPoetryService from "../services/aiPoetryService.js";
import {
  enhanceSearchQuery,
  analyzeExtractedText,
  generateSmartSuggestions,
  improveVoiceTranscription,
} from "../config/openai.js";

// Timeout wrapper for AI functions to prevent hanging
const withTimeout = (asyncFn, timeoutMs = 5000) => {
  return async (...args) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Function timeout")), timeoutMs)
    );

    try {
      return await Promise.race([asyncFn(...args), timeoutPromise]);
    } catch (error) {
      console.warn(`Function timed out or failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  };
};

// Helper function to create fuzzy search instance
const createFuseInstance = (data, keys) => {
  return new Fuse(data, {
    keys,
    threshold: 0.3, // Lower = more strict matching
    distance: 100,
    includeScore: true,
    includeMatches: true,
  });
};

// Helper function to clean and process Urdu text
const processUrduText = (text) => {
  // Remove extra whitespace and normalize
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // Remove diacritics
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

// 1. Enhanced Text Search with dynamic MongoDB integration
export const textSearch = async (req, res) => {
  try {
    const {
      query,
      category,
      mood,
      theme,
      language,
      sortBy = "relevance",
      useAI = true,
      page = 1,
      limit = 20,
    } = req.query || req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    let searchQuery = {};
    let sortOptions = {};

    // Build MongoDB search query with regex for multi-field search
    const searchTerms = query.trim().split(/\s+/);
    const regexPattern = searchTerms
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    // Multi-field search with regex
    searchQuery.$or = [
      { title: { $regex: regexPattern, $options: "i" } },
      { content: { $regex: regexPattern, $options: "i" } },
      { author: { $regex: regexPattern, $options: "i" } },
      { "metadata.theme": { $regex: regexPattern, $options: "i" } },
      {
        "metadata.keywords": {
          $in: searchTerms.map((term) => new RegExp(term, "i")),
        },
      },
    ];

    // Add filters
    if (category && category !== "all") {
      searchQuery.category = category;
    }
    if (mood && mood !== "all") {
      searchQuery["metadata.mood"] = mood;
    }
    if (theme && theme !== "all") {
      searchQuery["metadata.theme"] = theme;
    }
    if (language && language !== "all") {
      searchQuery.language = language;
    }

    // Only show published poems
    searchQuery.status = "published";

    // Sort options
    switch (sortBy) {
      case "newest":
        sortOptions = { createdAt: -1 };
        break;
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "mostViewed":
        sortOptions = { views: -1 };
        break;
      case "topRated":
        sortOptions = { rating: -1 };
        break;
      default:
        sortOptions = { views: -1, rating: -1 };
    }

    const skipCount1 = (parseInt(page) - 1) * parseInt(limit);

    // Execute search with population
    const [poems, totalCount] = await Promise.all([
      Poem.find(searchQuery)
        .sort(sortOptions)
        .skip(skipCount1)
        .limit(parseInt(limit))
        .populate("author", "name profile.penName")
        .lean(),
      Poem.countDocuments(searchQuery),
    ]);

    // Process results for better presentation
    const processedResults = poems.map((poem) => ({
      _id: poem._id,
      title: poem.title,
      content: poem.content,
      snippet: poem.content.substring(0, 150) + "...",
      author: poem.author?.name || poem.author?.profile?.penName || "Unknown",
      category: poem.category,
      mood: poem.metadata?.mood,
      theme: poem.metadata?.theme,
      views: poem.views || 0,
      rating: poem.rating || 0,
      createdAt: poem.createdAt,
      language: poem.language || "urdu",
    }));

    // Apply Fuse.js fuzzy search for better relevance
    if (processedResults.length > 0) {
      const fuse = createFuseInstance(processedResults, [
        "title",
        "content",
        "author",
        "category",
        "mood",
        "theme",
      ]);

      const fuzzyResults = fuse.search(query);
      const fuzzyMatches = fuzzyResults.map((result) => ({
        ...result.item,
        score: result.score,
        matches: result.matches,
      }));

      // Combine MongoDB and Fuse.js results
      const finalResults =
        fuzzyMatches.length > 0 ? fuzzyMatches : processedResults;

      return res.json({
        success: true,
        results: finalResults,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
        query: {
          original: query,
          processed: searchTerms,
          filters: { category, mood, theme, language, sortBy },
        },
        searchType: "text",
        aiEnhanced: useAI === "true",
      });
    }

    return res.json({
      success: true,
      results: [],
      message: "No poems found matching your search criteria",
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0,
      },
      query: {
        original: query,
        processed: searchTerms,
        filters: { category, mood, theme, language, sortBy },
      },
      searchType: "text",
    });

    const processedQuery = processUrduText(query);
    const skipCount2 = (page - 1) * limit;

    // Build enhanced search strategies with poet name matching
    const searchStrategies = [];

    // Check if query matches any poet names (both English and Urdu)
    const poetMatches = await Poet.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { urduName: { $regex: query, $options: "i" } },
        { name: { $regex: processedQuery, $options: "i" } },
        { urduName: { $regex: processedQuery, $options: "i" } },
      ],
    }).select("_id name urduName");

    // Primary search with original query including poet search
    const primarySearchConditions = [
      { title: { $regex: processedQuery, $options: "i" } },
      { content: { $regex: processedQuery, $options: "i" } },
      { searchKeywords: { $in: processedQuery.split(" ") } },
    ];

    // Add poet-based search if poets found
    if (poetMatches.length > 0) {
      primarySearchConditions.push({
        poet: { $in: poetMatches.map((p) => p._id) },
      });
    }

    searchStrategies.push({
      $or: primarySearchConditions,
      status: "published",
    });

    // Fallback search without status restriction (for debugging)
    searchStrategies.push({
      $or: primarySearchConditions,
    });

    // Enhanced search with AI-suggested terms
    if (enhancedData && enhancedData.success) {
      for (const term of searchTerms.slice(1)) {
        const processedTerm = processUrduText(term);
        if (processedTerm.length > 1) {
          searchStrategies.push({
            $or: [
              { title: { $regex: processedTerm, $options: "i" } },
              { content: { $regex: processedTerm, $options: "i" } },
              { tags: { $in: [processedTerm] } },
              { mood: { $regex: processedTerm, $options: "i" } },
              { theme: { $regex: processedTerm, $options: "i" } },
            ],
            status: "published",
          });
        }
      }

      // Search by poet names if suggested
      if (enhancedData.relatedPoets && enhancedData.relatedPoets.length > 0) {
        const poets = await Poet.find({
          name: {
            $in: enhancedData.relatedPoets.map((p) => new RegExp(p, "i")),
          },
        });
        if (poets.length > 0) {
          searchStrategies.push({
            poet: { $in: poets.map((p) => p._id) },
            status: "published",
          });
        }
      }

      // Search by poetry forms
      if (enhancedData.poetryForms && enhancedData.poetryForms.length > 0) {
        searchStrategies.push({
          category: { $in: enhancedData.poetryForms },
          status: "published",
        });
      }

      // Search by emotional context
      if (
        enhancedData.emotionalContext &&
        enhancedData.emotionalContext.length > 0
      ) {
        searchStrategies.push({
          mood: { $in: enhancedData.emotionalContext },
          status: "published",
        });
      }
    }

    const results = await Poem.find({ $or: searchStrategies })
      .populate("poet", "name bio profileImage")
      .populate("author", "username profile.fullName")
      .sort({ views: -1, averageRating: -1, publishedAt: -1 })
      .skip(skipCount2)
      .limit(limit);

    // Check total count in database for debugging
    const totalPoems = await Poem.countDocuments({ status: "published" });

    // Calculate enhanced relevance scores with AI context
    const scoredResults = results.map((poem) => {
      let score = 0;
      const titleLower = poem.title.toLowerCase();
      const contentLower = poem.content.toLowerCase();
      const queryLower = processedQuery;

      // Title exact match gets highest score
      if (titleLower.includes(queryLower)) score += 100;

      // Content match
      const contentMatches = (
        contentLower.match(new RegExp(queryLower, "gi")) || []
      ).length;
      score += contentMatches * 10;

      // AI-enhanced scoring for related terms
      if (enhancedData && enhancedData.success) {
        // Bonus for poet match
        if (
          enhancedData.relatedPoets.some((poet) =>
            poem.poet?.name?.toLowerCase().includes(poet.toLowerCase())
          )
        ) {
          score += 50;
        }

        // Bonus for emotional context match
        if (
          enhancedData.emotionalContext.some((emotion) =>
            poem.mood?.toLowerCase().includes(emotion.toLowerCase())
          )
        ) {
          score += 30;
        }

        // Bonus for poetry form match
        if (
          enhancedData.poetryForms.some((form) =>
            poem.category?.toLowerCase().includes(form.toLowerCase())
          )
        ) {
          score += 40;
        }
      }

      // Popular poems get bonus
      score += Math.log(poem.views + 1) * 2;
      score += poem.averageRating * 5;

      return {
        ...poem.toObject(),
        relevanceScore: score,
        excerpt:
          poem.content.substring(0, 200) +
          (poem.content.length > 200 ? "..." : ""),
      };
    });

    // Sort by relevance score
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      success: true,
      results: scoredResults,
      aiEnhancement: enhancedData,
      searchTermsUsed: searchTerms,
      pagination: {
        page,
        limit,
        total: scoredResults.length,
        hasNext: scoredResults.length === limit,
      },
    });
  } catch (error) {
    console.error("Text search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Fuzzy Search for misspellings and similar words
export const fuzzySearch = async (req, res) => {
  try {
    const { query, limit = 30 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Get all published poems for fuzzy search
    const allPoems = await Poem.find({ status: "published" })
      .populate("poet", "name bio")
      .populate("author", "username profile.fullName")
      .select(
        "title content searchKeywords category mood theme views averageRating"
      );

    // Create fuzzy search instance
    const fuse = createFuseInstance(allPoems, [
      "title",
      "content",
      "searchKeywords",
      "category",
      "mood",
      "theme",
    ]);

    // Perform fuzzy search
    const fuzzyResults = fuse.search(query, { limit });

    const results = fuzzyResults.map((result) => ({
      ...result.item.toObject(),
      fuzzyScore: result.score,
      matches: result.matches,
      excerpt:
        result.item.content.substring(0, 200) +
        (result.item.content.length > 200 ? "..." : ""),
    }));

    res.json({
      success: true,
      results,
      searchType: "fuzzy",
      originalQuery: query,
    });
  } catch (error) {
    console.error("Fuzzy search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Voice Search with ChatGPT transcription improvement
export const voiceSearch = async (req, res) => {
  try {
    const { transcribedText, confidence = 0 } = req.body;

    if (!transcribedText || transcribedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Transcribed text is required",
      });
    }

    let improvedTranscription = transcribedText;
    let improvementData = null;

    // Use ChatGPT to improve voice transcription for low confidence
    if (confidence < 0.8) {
      try {
        improvementData = await improveVoiceTranscription(
          transcribedText,
          confidence
        );
        if (improvementData.success) {
          improvedTranscription = improvementData.improvedText;
        }
      } catch (error) {
        console.warn(
          "Voice improvement failed, using original:",
          error.message
        );
      }
    }

    // Determine search method based on improved confidence
    const finalConfidence = improvementData?.confidence || confidence;
    const searchMethod = finalConfidence < 0.7 ? "fuzzy" : "text";

    let results;
    if (searchMethod === "fuzzy") {
      // Use fuzzy search for low confidence transcriptions
      const allPoems = await Poem.find({ status: "published" })
        .populate("poet", "name bio profileImage")
        .populate("author", "username profile.fullName")
        .select("title content searchKeywords category mood theme");

      const fuse = createFuseInstance(allPoems, [
        "title",
        "content",
        "searchKeywords",
        "category",
        "mood",
        "theme",
      ]);
      const fuzzyResults = fuse.search(improvedTranscription, { limit: 20 });

      results = fuzzyResults.map((result) => ({
        ...result.item.toObject(),
        fuzzyScore: result.score,
        excerpt:
          result.item.content.substring(0, 200) +
          (result.item.content.length > 200 ? "..." : ""),
      }));
    } else {
      // Use enhanced text search for high confidence
      const searchReq = {
        body: {
          query: improvedTranscription,
          limit: 20,
          page: 1,
          useAI: true,
        },
      };

      const searchRes = {
        json: (data) => {
          results = data.results || [];
        },
      };

      // Call the enhanced textSearch function
      await textSearch(searchReq, searchRes);
    }

    res.json({
      success: true,
      results,
      searchType: "voice",
      originalTranscription: transcribedText,
      improvedTranscription: improvedTranscription,
      originalConfidence: confidence,
      finalConfidence: finalConfidence,
      method: searchMethod,
      improvementData: improvementData,
    });
  } catch (error) {
    console.error("Voice search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Image-based search using OCR with ChatGPT text analysis
export const imageSearch = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    let imageUrl = image;

    // Upload to Cloudinary if it's a base64 image
    if (image.startsWith("data:")) {
      const uploadedImage = await cloudinary.uploader.upload(image, {
        folder: "poetry-search",
        resource_type: "image",
      });
      imageUrl = uploadedImage.secure_url;
    }

    // Perform OCR with multiple languages
    const {
      data: { text, confidence },
    } = await Tesseract.recognize(
      imageUrl,
      "urd+eng+ara", // Urdu, English, Arabic
      {
        logger: (m) => console.log(m),
      }
    );

    if (!text || text.trim().length === 0) {
      return res.json({
        success: true,
        extractedText: "",
        results: [],
        message: "No text could be extracted from the image",
      });
    }

    // Use ChatGPT to analyze and improve extracted text
    let analysisData = null;
    let searchQuery = text;

    try {
      analysisData = await analyzeExtractedText(text);
      if (analysisData.success) {
        searchQuery = analysisData.cleanedText || text;
      }
    } catch (error) {
      console.warn("OCR text analysis failed, using raw OCR:", error.message);
    }

    const cleanedText = processUrduText(searchQuery);

    // Search using AI-enhanced extracted text with multiple strategies
    let results = [];

    // Try exact search with cleaned text
    const exactResults = await Poem.find({
      $or: [
        { title: { $regex: cleanedText, $options: "i" } },
        { content: { $regex: cleanedText, $options: "i" } },
        { searchKeywords: { $in: cleanedText.split(" ") } },
      ],
      status: "published",
    })
      .populate("poet", "name bio profileImage")
      .populate("author", "username profile.fullName")
      .limit(10);

    if (exactResults.length > 0) {
      results = exactResults;
    } else {
      // Fallback to fuzzy search if no exact matches
      const allPoems = await Poem.find({ status: "published" })
        .populate("poet", "name bio profileImage")
        .populate("author", "username profile.fullName")
        .select("title content searchKeywords category mood theme");

      const fuse = createFuseInstance(allPoems, [
        "title",
        "content",
        "searchKeywords",
        "category",
        "mood",
        "theme",
      ]);
      const fuzzyResults = fuse.search(cleanedText, { limit: 10 });

      results = fuzzyResults.map((result) => result.item);
    }

    // Additional AI-enhanced search if available
    if (
      analysisData &&
      analysisData.success &&
      analysisData.searchKeywords.length > 0
    ) {
      const aiResults = await Poem.find({
        $or: [
          { tags: { $in: analysisData.searchKeywords } },
          { mood: { $in: analysisData.emotions } },
          { category: { $in: [analysisData.poetryForm] } },
          {
            title: {
              $regex: analysisData.searchKeywords.join("|"),
              $options: "i",
            },
          },
          {
            content: {
              $regex: analysisData.searchKeywords.join("|"),
              $options: "i",
            },
          },
        ],
        status: "published",
      })
        .populate("poet", "name bio profileImage")
        .populate("author", "username profile.fullName")
        .limit(5);

      // Merge results, avoiding duplicates
      const existingIds = results.map((r) => r._id.toString());
      const newResults = aiResults.filter(
        (r) => !existingIds.includes(r._id.toString())
      );
      results = [...results, ...newResults];
    }

    res.json({
      success: true,
      extractedText: text,
      cleanedText: searchQuery,
      ocrConfidence: confidence,
      textAnalysis: analysisData,
      results: results.map((poem) => ({
        ...poem.toObject(),
        excerpt:
          poem.content.substring(0, 200) +
          (poem.content.length > 200 ? "..." : ""),
      })),
      searchType: "image",
    });
  } catch (error) {
    console.error("Image search error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      details: "OCR processing failed",
    });
  }
};

// 5. Smart Search Suggestions - Simplified version without OpenAI dependency
export const getSmartSuggestions = async (req, res) => {
  try {
    // Handle both GET (query params) and POST (body) requests
    const query = req.query.query || req.body.partialQuery || req.body.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: [],
        message: "Query too short for suggestions",
      });
    }

    // Hardcoded smart suggestions based on Urdu poetry patterns
    const smartSuggestions = [
      "محبت کی شاعری",
      "غالب کے اشعار",
      "اقبال کی نظمیں",
      "دکھ کے گیت",
      "فراق کی غزلیں",
      "میر تقی میر",
      "عشق کی باتیں",
      "زندگی کے گیت",
      "حافظ شیرازی",
      "سعدی کے اشعار",
      "غزل کی دنیا",
      "نظم آزاد",
      "قلندر کی بات",
      "صوفی شاعری",
    ];

    // Filter suggestions based on partial query
    const filteredSuggestions = smartSuggestions.filter(
      (suggestion) =>
        suggestion.includes(query) ||
        query.includes(suggestion.split(" ")[0]) ||
        query.length < 3
    );

    // Always return at least some suggestions
    const finalSuggestions =
      filteredSuggestions.length > 0
        ? filteredSuggestions.slice(0, 8)
        : smartSuggestions.slice(0, 6);

    res.json({
      success: true,
      suggestions: finalSuggestions,
      totalSuggestions: finalSuggestions.length,
      query: query,
    });
  } catch (error) {
    console.error("Smart suggestions error:", error);
    // Always return a success response with fallback data
    res.json({
      success: true,
      suggestions: [
        "محبت کی شاعری",
        "غالب کے اشعار",
        "اقبال کی نظمیں",
        "دکھ کے گیت",
      ],
      message: "Using fallback suggestions",
    });
  }
};

// 6. Advanced search with multiple filters
export const advancedSearch = async (req, res) => {
  try {
    const {
      query,
      poetName,
      category,
      mood,
      theme,
      language,
      dateRange,
      minRating,
      sortBy = "relevance",
      limit = 50,
      page = 1,
    } = req.body;

    let searchQuery = { status: "published" };
    const skipCount3 = (page - 1) * limit;

    // Text search
    if (query && query.trim().length > 0) {
      const processedQuery = processUrduText(query);
      searchQuery.$or = [
        { title: { $regex: processedQuery, $options: "i" } },
        { content: { $regex: processedQuery, $options: "i" } },
        { searchKeywords: { $in: processedQuery.split(" ") } },
      ];
    }

    // Poet filter
    if (poetName && poetName.trim().length > 0) {
      const poets = await Poet.find({
        name: { $regex: poetName, $options: "i" },
      }).select("_id");
      if (poets.length > 0) {
        searchQuery.poet = { $in: poets.map((p) => p._id) };
      }
    }

    // Category filter
    if (category && category !== "all") {
      searchQuery.category = category;
    }

    // Mood filter
    if (mood && mood !== "all") {
      searchQuery.mood = mood;
    }

    // Theme filter
    if (theme && theme !== "all") {
      searchQuery.theme = theme;
    }

    // Language filter
    if (language && language !== "all") {
      searchQuery.poetryLanguage = language;
    }

    // Date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      searchQuery.publishedAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end),
      };
    }

    // Minimum rating filter
    if (minRating && minRating > 0) {
      searchQuery.averageRating = { $gte: minRating };
    }

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
      case "newest":
        sortOptions = { publishedAt: -1 };
        break;
      case "oldest":
        sortOptions = { publishedAt: 1 };
        break;
      case "mostViewed":
        sortOptions = { views: -1 };
        break;
      case "topRated":
        sortOptions = { averageRating: -1 };
        break;
      case "relevance":
      default:
        sortOptions = { views: -1, averageRating: -1, publishedAt: -1 };
        break;
    }

    const results = await Poem.find(searchQuery)
      .populate("poet", "name bio profileImage")
      .populate("author", "username profile.fullName")
      .sort(sortOptions)
      .skip(skipCount3)
      .limit(limit);

    const totalCount = await Poem.countDocuments(searchQuery);

    res.json({
      success: true,
      results: results.map((poem) => ({
        ...poem.toObject(),
        excerpt:
          poem.content.substring(0, 200) +
          (poem.content.length > 200 ? "..." : ""),
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        hasNext: skipCount3 + results.length < totalCount,
        hasPrev: page > 1,
      },
      filters: {
        query,
        poetName,
        category,
        mood,
        theme,
        language,
        dateRange,
        minRating,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Advanced search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Unified Search - Combines Database, Rekhta API, and OpenAI
export const unifiedSearch = async (req, res) => {
  try {
    const {
      query,
      limit = 20,
      page = 1,
      useAI = true,
      includeRekhta = true,
      sources = ["database", "rekhta", "ai"], // Which sources to search
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    console.log(
      `🔍 Unified search for: "${query}" across sources: ${sources.join(", ")}`
    );

    const results = {
      success: true,
      query: query,
      sources: {
        database: { poems: [], count: 0, source: "Local Database" },
        rekhta: { poems: [], count: 0, source: "Rekhta.org" },
        ai: { suggestions: [], recommendations: [], source: "OpenAI" },
      },
      combined: [],
      searchTime: new Date().toISOString(),
    };

    // 1. Search Local Database
    if (sources.includes("database")) {
      try {
        console.log("🔍 Searching local database...");
        const processedQuery = processUrduText(query);

        const databaseResults = await Poem.find({
          $or: [
            { title: { $regex: processedQuery, $options: "i" } },
            { content: { $regex: processedQuery, $options: "i" } },
            { searchKeywords: { $in: processedQuery.split(" ") } },
          ],
          status: "published",
        })
          .populate("poet", "name bio profileImage")
          .populate("author", "username profile.fullName")
          .sort({ views: -1, averageRating: -1 })
          .limit(Math.floor(limit / 2)); // Reserve half for database

        results.sources.database.poems = databaseResults.map((poem) => ({
          ...poem.toObject(),
          source: "database",
          excerpt:
            poem.content.substring(0, 200) +
            (poem.content.length > 200 ? "..." : ""),
          relevanceScore: calculateRelevanceScore(poem, query),
        }));
        results.sources.database.count = databaseResults.length;

        console.log(
          `✅ Found ${databaseResults.length} poems in local database`
        );
      } catch (error) {
        console.error("❌ Database search error:", error);
        results.sources.database.error = error.message;
      }
    }

    // 2. Search Rekhta API
    if (sources.includes("rekhta") && includeRekhta) {
      try {
        console.log("🔍 Searching Rekhta API...");

        // First try searching for poems
        const rekhtaSearchResults = await RekhtaService.searchPoems(
          query,
          "poem"
        );

        if (
          rekhtaSearchResults.success &&
          rekhtaSearchResults.results.length > 0
        ) {
          results.sources.rekhta.poems = rekhtaSearchResults.results
            .slice(0, Math.floor(limit / 3))
            .map((poem) => ({
              title: poem.title,
              content: poem.content,
              url: poem.url,
              type: poem.type,
              source: "rekhta",
              excerpt:
                poem.content.substring(0, 200) +
                (poem.content.length > 200 ? "..." : ""),
              relevanceScore: calculateTextRelevance(poem.content, query),
            }));
          results.sources.rekhta.count = rekhtaSearchResults.results.length;
          console.log(
            `✅ Found ${rekhtaSearchResults.results.length} poems from Rekhta`
          );
        } else {
          // Try searching for poet-specific content
          const poetQuery = extractPoetName(query);
          if (poetQuery) {
            console.log(`🔍 Searching for poet: ${poetQuery}`);
            const poetResults = await RekhtaService.getPoemsByPoet(
              poetQuery,
              1,
              5
            );

            if (poetResults.success && poetResults.poems.length > 0) {
              results.sources.rekhta.poems = poetResults.poems.map((poem) => ({
                ...poem,
                source: "rekhta",
                poet: poetResults.poet,
                excerpt:
                  poem.content.substring(0, 200) +
                  (poem.content.length > 200 ? "..." : ""),
                relevanceScore: calculateTextRelevance(poem.content, query),
              }));
              results.sources.rekhta.count = poetResults.poems.length;
              console.log(
                `✅ Found ${poetResults.poems.length} poems by poet ${poetQuery}`
              );
            }
          }
        }

        // Get featured poems as fallback
        if (results.sources.rekhta.count === 0) {
          console.log("🔍 Getting featured poems as fallback...");
          const featuredResults = await RekhtaService.getFeaturedPoems();
          if (featuredResults.success) {
            results.sources.rekhta.poems = featuredResults.poems
              .slice(0, 3)
              .map((poem) => ({
                ...poem,
                source: "rekhta",
                excerpt:
                  poem.content.substring(0, 200) +
                  (poem.content.length > 200 ? "..." : ""),
                relevanceScore: 0.3, // Low relevance for featured content
              }));
            results.sources.rekhta.count = featuredResults.poems.length;
            results.sources.rekhta.note =
              "Featured poems (no direct matches found)";
          }
        }
      } catch (error) {
        console.error("❌ Rekhta search error:", error);
        results.sources.rekhta.error = error.message;
      }
    }

    // 3. AI-Enhanced Suggestions and Analysis
    if (sources.includes("ai") && useAI) {
      try {
        console.log("🔍 Getting AI suggestions...");

        // Get AI writing suggestions for the query
        const suggestions = await AIPoetryService.generateWritingSuggestions(
          query,
          "ghazal"
        );
        if (suggestions.success) {
          results.sources.ai.suggestions = suggestions.suggestions;
          console.log(`✅ Generated AI writing suggestions`);
        }

        // Get AI recommendations based on available poems
        const allPoems = [
          ...results.sources.database.poems,
          ...results.sources.rekhta.poems,
        ];
        if (allPoems.length > 0) {
          const mockUserProfile = {
            favoriteCategories: [query],
            favoritePoets: [extractPoetName(query)].filter(Boolean),
            preferredThemes: [query],
          };

          const recommendations =
            await AIPoetryService.generatePersonalizedRecommendations(
              mockUserProfile,
              allPoems
            );

          if (recommendations.success) {
            results.sources.ai.recommendations =
              recommendations.recommendations;
            results.sources.ai.reasoning = recommendations.reasoning;
            console.log(`✅ Generated AI recommendations`);
          }
        }
      } catch (error) {
        console.error("❌ AI processing error:", error);
        results.sources.ai.error = error.message;
      }
    }

    // 4. Combine and rank all results
    const combinedPoems = [
      ...results.sources.database.poems,
      ...results.sources.rekhta.poems,
    ];

    // Sort by relevance score and source priority
    combinedPoems.sort((a, b) => {
      // Prioritize database results slightly
      if (a.source === "database" && b.source !== "database") return -0.1;
      if (b.source === "database" && a.source !== "database") return 0.1;

      return b.relevanceScore - a.relevanceScore;
    });

    results.combined = combinedPoems.slice(0, limit);

    // 5. Add summary statistics
    results.summary = {
      totalResults: combinedPoems.length,
      databaseResults: results.sources.database.count,
      rekhtaResults: results.sources.rekhta.count,
      aiSuggestions: results.sources.ai.suggestions?.length || 0,
      searchComplete: true,
      searchDuration: `${
        Date.now() - new Date(results.searchTime).getTime()
      }ms`,
    };

    console.log(
      `🎉 Unified search complete: ${results.combined.length} total results`
    );

    res.json(results);
  } catch (error) {
    console.error("Unified search error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      query: req.body.query || "Unknown query",
    });
  }
};

// Helper functions for unified search
function calculateRelevanceScore(poem, query) {
  const queryLower = query.toLowerCase();
  const titleLower = poem.title.toLowerCase();
  const contentLower = poem.content.toLowerCase();

  let score = 0;

  // Title exact match gets highest score
  if (titleLower.includes(queryLower)) score += 100;

  // Content matches
  const contentMatches = (
    contentLower.match(new RegExp(queryLower, "gi")) || []
  ).length;
  score += contentMatches * 10;

  // Popularity bonus
  score += Math.log(poem.views + 1) * 2;
  score += poem.averageRating * 5;

  return score;
}

function calculateTextRelevance(text, query) {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  const matches = (textLower.match(new RegExp(queryLower, "gi")) || []).length;
  return matches * 10 + (textLower.includes(queryLower) ? 50 : 0);
}

function extractPoetName(query) {
  const commonPoets = {
    غالب: "ghalib",
    ghalib: "ghalib",
    mirza: "ghalib",
    "mirza ghalib": "ghalib",
    اقبال: "iqbal",
    iqbal: "iqbal",
    "allama iqbal": "iqbal",
    "علامہ اقبال": "iqbal",
    فیض: "faiz",
    faiz: "faiz",
    "faiz ahmed faiz": "faiz",
    "فیض احمد فیض": "faiz",
    میر: "mir",
    mir: "mir",
    "mir taqi mir": "mir",
    "میر تقی میر": "mir",
    ذوق: "zauq",
    zauq: "zauq",
    "ibrahim zauq": "zauq",
    "ابراہیم ذوق": "zauq",
  };

  const queryLower = query.toLowerCase();
  for (const [poet, slug] of Object.entries(commonPoets)) {
    if (queryLower.includes(poet.toLowerCase())) {
      return slug;
    }
  }
  return null;
}
