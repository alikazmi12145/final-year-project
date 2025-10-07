import Poem from "../models/Poem.js";
import User from "../models/User.js";
import Poet from "../models/poet.js";
import natural from "natural";
import Tesseract from "tesseract.js";
import Fuse from "fuse.js";
import cloudinary from "../config/cloudinary.js";
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

// 1. Enhanced Text Search with ChatGPT integration
export const textSearch = async (req, res) => {
  try {
    const { query, limit = 50, page = 1, useAI = true } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    let searchTerms = [query];
    let enhancedData = null;

    // Use ChatGPT to enhance the search query with timeout
    if (useAI) {
      try {
        const enhanceWithTimeout = withTimeout(enhanceSearchQuery, 5000);
        enhancedData = await enhanceWithTimeout(query);
        if (enhancedData.success) {
          searchTerms = [
            query,
            enhancedData.urduTranslation,
            ...enhancedData.enhancedKeywords,
            ...enhancedData.semanticExpansion,
          ].filter((term) => term && term.trim().length > 0);
        }
      } catch (error) {
        console.warn(
          "AI enhancement failed, using basic search:",
          error.message
        );
        // Continue with basic search
        enhancedData = { success: false };
      }
    }

    const processedQuery = processUrduText(query);
    const skip = (page - 1) * limit;

    // Build enhanced search strategies using AI-powered terms
    const searchStrategies = [];

    // Primary search with original query
    searchStrategies.push({
      $or: [
        { title: { $regex: processedQuery, $options: "i" } },
        { content: { $regex: processedQuery, $options: "i" } },
        { searchKeywords: { $in: processedQuery.split(" ") } },
      ],
      status: "published",
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
      .skip(skip)
      .limit(limit);

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

// 5. Smart Search Suggestions using ChatGPT
export const getSmartSuggestions = async (req, res) => {
  try {
    const { partialQuery } = req.body;

    if (!partialQuery || partialQuery.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: [],
        message: "Query too short for suggestions",
      });
    }

    const suggestionsData = await generateSmartSuggestions(partialQuery);

    // Also get recent popular searches as fallback
    const popularSearches = [
      "محبت کی شاعری",
      "غالب کے اشعار",
      "اقبال کی نظمیں",
      "دکھ کے گیت",
      "فراق کی غزلیں",
      "میر تقی میر",
      "عشق کی باتیں",
      "زندگی کے گیت",
    ];

    res.json({
      success: true,
      aiSuggestions: suggestionsData.suggestions || [],
      popularSuggestions: popularSearches,
      totalSuggestions:
        (suggestionsData.suggestions || []).length + popularSearches.length,
    });
  } catch (error) {
    console.error("Smart suggestions error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      suggestions: [],
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
    const skip = (page - 1) * limit;

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
      .skip(skip)
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
        hasNext: skip + results.length < totalCount,
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
